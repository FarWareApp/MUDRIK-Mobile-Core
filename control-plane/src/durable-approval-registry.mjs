import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {
  constants as fsConstants,
} from 'node:fs';
import path from 'node:path';

import {
  parseApprovalRecord,
} from './approval-registry.mjs';

import {
  isControlId,
} from './ids.mjs';

const MAX_RECORD_BYTES =
  2 * 1024 * 1024;

function canonical(record) {
  return JSON.stringify(record);
}

function integrity(
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

function validKey(value) {
  return (
    Buffer.isBuffer(value)
    && value.byteLength >= 32
  );
}

function sameCapabilities(a, b) {
  return (
    a.length === b.length
    && a.every(
      (value, index) =>
        value === b[index],
    )
  );
}

function bindingMatches(
  approval,
  task,
) {
  return (
    approval.accountId
      === task.accountId
    && approval.sourceSessionId
      === task.sourceSessionId
    && approval.destinationDeviceId
      === task.destinationDeviceId
    && approval.taskId
      === task.taskId
    && approval.scopeDigest
      === task.scopeDigest
    && approval.risk
      === task.risk
    && approval.policyVersion
      === task.policyVersion
    && sameCapabilities(
      approval.capabilities,
      task.requestedCapabilities,
    )
  );
}

function validTime(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

export class DurableApprovalRegistry {
  constructor({
    directory,
    integrityKey,
  } = {}) {
    if (
      typeof directory !== 'string'
      || !path.isAbsolute(directory)
      || !validKey(integrityKey)
    ) {
      throw new TypeError(
        'Invalid durable approval registry.',
      );
    }

    this.directory = directory;
    this.integrityKey =
      Buffer.from(integrityKey);
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

  filePath(approvalId) {
    if (
      !isControlId(
        'approval',
        approvalId,
      )
    ) {
      throw new TypeError(
        'Invalid approval id.',
      );
    }

    return path.join(
      this.directory,
      approvalId + '.json',
    );
  }

  async withLock(
    approvalId,
    work,
  ) {
    const previous =
      this.locks.get(approvalId)
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
      approvalId,
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
        this.locks.get(approvalId)
          === tail
      ) {
        this.locks.delete(
          approvalId,
        );
      }
    }
  }

  async fsyncDirectory() {
    let handle;

    try {
      handle =
        await fs.open(
          this.directory,
          'r',
        );
      await handle.sync();
    } finally {
      await handle?.close();
    }
  }

  async writeAtomic(record) {
    const file =
      this.filePath(
        record.approvalId,
      );
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
        integrity(
          this.integrityKey,
          record,
        ),
    };
    const body =
      JSON.stringify(
        envelope,
        null,
        2,
      ) + '\n';

    let handle;

    try {
      handle =
        await fs.open(
          temp,
          'wx',
          0o600,
        );
      await handle.writeFile(
        body,
        'utf8',
      );
      await handle.sync();
      await handle.close();
      handle = null;

      await fs.rename(
        temp,
        file,
      );
      await fs.chmod(
        file,
        0o600,
      );
      await this.fsyncDirectory();
    } catch (error) {
      await handle?.close()
        .catch(() => {});
      await fs.unlink(temp)
        .catch(() => {});
      throw error;
    }
  }

  async readUnlocked(
    approvalId,
  ) {
    const file =
      this.filePath(approvalId);
    let handle;

    try {
      handle =
        await fs.open(
          file,
          fsConstants.O_RDONLY
            | (
              fsConstants.O_NOFOLLOW
              ?? 0
            ),
        );
    } catch (error) {
      if (
        error
        && error.code === 'ENOENT'
      ) {
        return null;
      }

      throw new Error(
        'approval_store_corrupt',
      );
    }

    let raw;

    try {
      const stat =
        await handle.stat();

      if (
        !stat.isFile()
        || stat.size < 2
        || stat.size
          > MAX_RECORD_BYTES
      ) {
        throw new Error(
          'approval_store_corrupt',
        );
      }

      raw =
        await handle.readFile(
          'utf8',
        );
    } finally {
      await handle.close();
    }

    let envelope;

    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new Error(
        'approval_store_corrupt',
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
        'approval_store_corrupt',
      );
    }

    const record =
      parseApprovalRecord(
        envelope.record,
      );

    if (
      !record
      || record.approvalId
        !== approvalId
    ) {
      throw new Error(
        'approval_store_corrupt',
      );
    }

    const expected =
      integrity(
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
        'approval_store_integrity_failed',
      );
    }

    return record;
  }

  get(approvalId) {
    return this.readUnlocked(
      approvalId,
    );
  }

  async register(input) {
    const record =
      parseApprovalRecord(input);

    if (
      !record
      || record.revision !== 0
      || record.state !== 'active'
    ) {
      return Object.freeze({
        accepted: false,
        reason:
          'approval_record_invalid',
      });
    }

    return this.withLock(
      record.approvalId,
      async () => {
        const existing =
          await this.readUnlocked(
            record.approvalId,
          );

        if (existing) {
          return canonical(existing)
            === canonical(record)
            ? Object.freeze({
                accepted: true,
                duplicate: true,
                record: existing,
              })
            : Object.freeze({
                accepted: false,
                reason:
                  'approval_id_conflict',
              });
        }

        await this.writeAtomic(
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

  async revoke({
    approvalId,
    expectedRevision,
  }) {
    return this.withLock(
      approvalId,
      async () => {
        const current =
          await this.readUnlocked(
            approvalId,
          );

        if (
          !current
          || current.revision
            !== expectedRevision
        ) {
          return Object.freeze({
            accepted: false,
            reason:
              'approval_update_conflict',
          });
        }

        if (
          current.state === 'revoked'
        ) {
          return Object.freeze({
            accepted: true,
            duplicate: true,
            record: current,
          });
        }

        if (
          current.state
            === 'consumed'
        ) {
          return Object.freeze({
            accepted: false,
            reason:
              'approval_already_consumed',
          });
        }

        const next =
          parseApprovalRecord({
            ...current,
            state: 'revoked',
            revision:
              current.revision + 1,
          });

        if (!next) {
          return Object.freeze({
            accepted: false,
            reason:
              'approval_record_invalid',
          });
        }

        await this.writeAtomic(next);

        return Object.freeze({
          accepted: true,
          duplicate: false,
          record: next,
        });
      },
    );
  }

  async authorizeTask({
    approvalId,
    task,
    trustedNowMs,
  }) {
    if (
      !isControlId(
        'approval',
        approvalId,
      )
      || !task
      || !validTime(
        trustedNowMs,
      )
    ) {
      return Object.freeze({
        allowed: false,
        reason:
          'approval_unknown',
      });
    }

    return this.withLock(
      approvalId,
      async () => {
        const current =
          await this.readUnlocked(
            approvalId,
          );

        if (!current) {
          return Object.freeze({
            allowed: false,
            reason:
              'approval_unknown',
          });
        }

        if (
          !bindingMatches(
            current,
            task,
          )
        ) {
          return Object.freeze({
            allowed: false,
            reason:
              'approval_binding_mismatch',
          });
        }

        if (
          current.expiresAtMs
            <= trustedNowMs
        ) {
          return Object.freeze({
            allowed: false,
            reason:
              'approval_expired',
          });
        }

        if (
          current.state
            === 'revoked'
        ) {
          return Object.freeze({
            allowed: false,
            reason:
              'approval_revoked',
          });
        }

        if (
          current.state
            === 'consumed'
        ) {
          return Object.freeze({
            allowed: true,
            duplicate: true,
            reason:
              'approval_already_consumed_for_task',
            record: current,
          });
        }

        if (
          current.mode
            === 'task_lifetime'
        ) {
          return Object.freeze({
            allowed: true,
            duplicate: false,
            reason:
              'approval_authorized',
            record: current,
          });
        }

        const next =
          parseApprovalRecord({
            ...current,
            state: 'consumed',
            consumedAtMs:
              trustedNowMs,
            revision:
              current.revision + 1,
          });

        if (!next) {
          return Object.freeze({
            allowed: false,
            reason:
              'approval_record_invalid',
          });
        }

        await this.writeAtomic(next);

        return Object.freeze({
          allowed: true,
          duplicate: false,
          reason:
            'approval_consumed',
          record: next,
        });
      },
    );
  }
}
