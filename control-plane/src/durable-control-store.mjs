import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  isControlId,
} from './ids.mjs';

import {
  parseControlTaskRecord,
} from './task-state.mjs';

function canonical(record) {
  return JSON.stringify(record);
}

function hmac(
  key,
  record,
) {
  return crypto
    .createHmac(
      'sha256',
      key,
    )
    .update(
      canonical(record),
      'utf8',
    )
    .digest('hex');
}

function validKey(key) {
  return (
    Buffer.isBuffer(key)
    && key.byteLength >= 32
  );
}

export class DurableControlTaskStore {
  constructor({
    directory,
    integrityKey,
  } = {}) {
    if (
      typeof directory
        !== 'string'
      || !path.isAbsolute(
        directory,
      )
      || !validKey(
        integrityKey,
      )
    ) {
      throw new TypeError(
        'Invalid durable control store.',
      );
    }

    this.directory =
      directory;
    this.integrityKey =
      Buffer.from(
        integrityKey,
      );
    this.locks = new Map();
  }

  async init() {
    await fs.mkdir(
      this.directory,
      {
        recursive: true,
        mode: 0o700,
      },
    );

    await fs.chmod(
      this.directory,
      0o700,
    );

    return this;
  }

  filePath(taskId) {
    if (
      !isControlId(
        'task',
        taskId,
      )
    ) {
      throw new TypeError(
        'Invalid task id.',
      );
    }

    return path.join(
      this.directory,
      taskId + '.json',
    );
  }

  async withLock(
    taskId,
    work,
  ) {
    const previous =
      this.locks.get(taskId)
      ?? Promise.resolve();

    let release;
    const gate =
      new Promise((resolve) => {
        release = resolve;
      });

    const tail =
      previous
        .catch(() => {})
        .then(() => gate);

    this.locks.set(
      taskId,
      tail,
    );

    await previous.catch(
      () => {},
    );

    try {
      return await work();
    } finally {
      release();

      if (
        this.locks.get(taskId)
          === tail
      ) {
        this.locks.delete(
          taskId,
        );
      }
    }
  }

  async writeAtomic(
    taskId,
    record,
  ) {
    const file =
      this.filePath(taskId);
    const temp =
      file
      + '.tmp-'
      + crypto
        .randomBytes(8)
        .toString('hex');

    const envelope = {
      version: 1,
      record,
      integrity:
        hmac(
          this.integrityKey,
          record,
        ),
    };

    await fs.writeFile(
      temp,
      JSON.stringify(
        envelope,
        null,
        2,
      ) + '\n',
      {
        mode: 0o600,
        flag: 'wx',
      },
    );

    await fs.rename(
      temp,
      file,
    );

    await fs.chmod(
      file,
      0o600,
    );
  }

  async readUnlocked(taskId) {
    const file =
      this.filePath(taskId);
    let raw;

    try {
      raw =
        await fs.readFile(
          file,
          'utf8',
        );
    } catch (error) {
      if (
        error
        && error.code === 'ENOENT'
      ) {
        return null;
      }

      throw error;
    }

    let envelope;

    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new Error(
        'control_store_corrupt',
      );
    }

    if (
      !envelope
      || typeof envelope
        !== 'object'
      || Array.isArray(envelope)
      || Object.keys(envelope)
        .length !== 3
      || envelope.version !== 1
      || typeof envelope.integrity
        !== 'string'
    ) {
      throw new Error(
        'control_store_corrupt',
      );
    }

    const record =
      parseControlTaskRecord(
        envelope.record,
      );

    if (!record) {
      throw new Error(
        'control_store_corrupt',
      );
    }

    const expected =
      hmac(
        this.integrityKey,
        record,
      );
    const actual =
      envelope.integrity;

    if (
      actual.length
        !== expected.length
      || !crypto.timingSafeEqual(
        Buffer.from(actual),
        Buffer.from(expected),
      )
    ) {
      throw new Error(
        'control_store_integrity_failed',
      );
    }

    return record;
  }

  async get(taskId) {
    return this.readUnlocked(
      taskId,
    );
  }

  async create(recordInput) {
    const record =
      parseControlTaskRecord(
        recordInput,
      );

    if (!record) {
      throw new Error(
        'control_store_record_invalid',
      );
    }

    const taskId =
      record.task.taskId;

    return this.withLock(
      taskId,
      async () => {
        const existing =
          await this
            .readUnlocked(taskId);

        if (existing) {
          if (
            canonical(existing)
              === canonical(record)
          ) {
            return Object.freeze({
              accepted: true,
              duplicate: true,
              record: existing,
            });
          }

          return Object.freeze({
            accepted: false,
            reason:
              'control_store_conflict',
          });
        }

        await this.writeAtomic(
          taskId,
          record,
        );

        return Object.freeze({
          accepted: true,
          duplicate: false,
          record,
        });
      },
    );
  }

  async replace(
    taskId,
    expectedRevision,
    nextInput,
  ) {
    const next =
      parseControlTaskRecord(
        nextInput,
      );

    if (
      !next
      || next.task.taskId
        !== taskId
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'control_store_record_invalid',
      });
    }

    return this.withLock(
      taskId,
      async () => {
        const current =
          await this
            .readUnlocked(taskId);

        if (
          !current
          || current.revision
            !== expectedRevision
          || next.revision
            !== current.revision + 1
        ) {
          return Object.freeze({
            accepted: false,
            reason:
              'control_store_cas_conflict',
          });
        }

        await this.writeAtomic(
          taskId,
          next,
        );

        return Object.freeze({
          accepted: true,
          duplicate: false,
          record: next,
        });
      },
    );
  }
}
