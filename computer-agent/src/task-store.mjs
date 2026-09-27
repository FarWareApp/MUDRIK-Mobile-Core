import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  parseComputerTaskEnvelope,
} from './task-envelope.mjs';

import {
  createTaskEvent,
  isTaskEvent,
} from './task-event.mjs';

import {
  isTaskId,
  isTaskLifecycle,
  transitionTaskLifecycle,
} from './task-lifecycle.mjs';

const FORMAT_VERSION = 1;
const MAX_RECORD_BYTES =
  4 * 1024 * 1024;

const INTEGRITY_TAG =
  /^[A-Za-z0-9_-]{43}$/;

const RECORD_KEYS = new Set([
  'formatVersion',
  'task',
  'lifecycle',
  'checkpoint',
  'events',
  'eventSequence',
  'storeRevision',
  'createdAtMs',
  'updatedAtMs',
  'integrityTag',
]);

const CHECKPOINT_KEYS = new Set([
  'revision',
  'nextStepIndex',
  'completedSteps',
  'inFlightStep',
  'updatedAtMs',
]);

const IN_FLIGHT_KEYS = new Set([
  'stepId',
  'stepIndex',
  'startedAtMs',
]);

const COMPLETED_STEP_KEYS =
  new Set([
    'stepId',
    'stepIndex',
    'outcome',
    'completedAtMs',
  ]);

function normalizeIntegrityKey(
  value,
) {
  if (
    !Buffer.isBuffer(value)
    && !(value instanceof Uint8Array)
  ) {
    throw new TypeError(
      'A binary durable-store integrity key is required.',
    );
  }

  const key = Buffer.from(value);

  if (key.byteLength < 32) {
    throw new TypeError(
      'Durable-store integrity key must be at least 32 bytes.',
    );
  }

  return Buffer.from(key);
}

function canonicalize(value) {
  if (
    value === null
    || typeof value !== 'object'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return (
      '['
      + value.map(canonicalize).join(',')
      + ']'
    );
  }

  const keys =
    Object.keys(value).sort();

  return (
    '{'
    + keys.map(
      (key) =>
        JSON.stringify(key)
        + ':'
        + canonicalize(value[key]),
    ).join(',')
    + '}'
  );
}

function integrityPayload(record) {
  const unsigned = {
    ...record,
  };

  delete unsigned.integrityTag;

  return Buffer.from(
    canonicalize(unsigned),
    'utf8',
  );
}

function computeIntegrityTag(
  record,
  integrityKey,
) {
  return crypto
    .createHmac(
      'sha256',
      integrityKey,
    )
    .update(
      integrityPayload(record),
    )
    .digest('base64url');
}

function sealRecord(
  record,
  integrityKey,
) {
  const unsigned = {
    ...record,
  };

  delete unsigned.integrityTag;

  return {
    ...unsigned,
    integrityTag:
      computeIntegrityTag(
        unsigned,
        integrityKey,
      ),
  };
}

function verifyRecordIntegrity(
  record,
  integrityKey,
) {
  if (
    typeof record !== 'object'
    || record === null
    || Array.isArray(record)
    || typeof record.integrityTag
      !== 'string'
    || !INTEGRITY_TAG.test(
      record.integrityTag,
    )
  ) {
    return false;
  }

  const expected =
    computeIntegrityTag(
      record,
      integrityKey,
    );
  const actualBuffer =
    Buffer.from(
      record.integrityTag,
      'base64url',
    );
  const expectedBuffer =
    Buffer.from(
      expected,
      'base64url',
    );

  return (
    actualBuffer.length
      === expectedBuffer.length
    && crypto.timingSafeEqual(
      actualBuffer,
      expectedBuffer,
    )
  );
}

function exactKeys(record, allowed) {
  return (
    Object.keys(record).length
      === allowed.size
    && Object.keys(record).every(
      (key) => allowed.has(key),
    )
  );
}

function safeInteger(value) {
  return (
    Number.isSafeInteger(value)
    && value >= 0
  );
}

function validateCompletedStep(
  value,
  task,
) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || !exactKeys(
      value,
      COMPLETED_STEP_KEYS,
    )
    || typeof value.stepId !== 'string'
    || !safeInteger(value.stepIndex)
    || ![
      'succeeded',
      'failed',
      'failed_continued',
    ].includes(value.outcome)
    || !safeInteger(
      value.completedAtMs,
    )
    || value.stepIndex
      >= task.steps.length
    || task.steps[
      value.stepIndex
    ].stepId !== value.stepId
  ) {
    return false;
  }

  return true;
}

function validateInFlightStep(
  value,
  checkpoint,
  task,
) {
  if (value === null) {
    return true;
  }

  return (
    typeof value === 'object'
    && !Array.isArray(value)
    && exactKeys(
      value,
      IN_FLIGHT_KEYS,
    )
    && typeof value.stepId
      === 'string'
    && safeInteger(
      value.stepIndex,
    )
    && safeInteger(
      value.startedAtMs,
    )
    && value.stepIndex
      === checkpoint.nextStepIndex
    && value.stepIndex
      < task.steps.length
    && task.steps[
      value.stepIndex
    ].stepId === value.stepId
  );
}

function validateCheckpoint(
  checkpoint,
  task,
) {
  if (
    typeof checkpoint !== 'object'
    || checkpoint === null
    || Array.isArray(checkpoint)
    || !exactKeys(
      checkpoint,
      CHECKPOINT_KEYS,
    )
    || !safeInteger(
      checkpoint.revision,
    )
    || !safeInteger(
      checkpoint.nextStepIndex,
    )
    || checkpoint.nextStepIndex
      > task.steps.length
    || !Array.isArray(
      checkpoint.completedSteps,
    )
    || !safeInteger(
      checkpoint.updatedAtMs,
    )
    || checkpoint.completedSteps.length
      !== checkpoint.nextStepIndex
    || !validateInFlightStep(
      checkpoint.inFlightStep,
      checkpoint,
      task,
    )
  ) {
    return false;
  }

  const ids = new Set();

  for (
    let index = 0;
    index < checkpoint.completedSteps.length;
    index += 1
  ) {
    const entry =
      checkpoint.completedSteps[index];

    if (
      !validateCompletedStep(
        entry,
        task,
      )
      || entry.stepIndex !== index
      || ids.has(entry.stepId)
    ) {
      return false;
    }

    ids.add(entry.stepId);
  }

  return true;
 }

function validateRecord(value) {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || !exactKeys(
      value,
      RECORD_KEYS,
    )
    || value.formatVersion
      !== FORMAT_VERSION
    || typeof value.integrityTag
      !== 'string'
    || !INTEGRITY_TAG.test(
      value.integrityTag,
    )
  ) {
    return false;
  }

  const task =
    parseComputerTaskEnvelope(
      value.task,
    );

  if (
    !task
    || !isTaskLifecycle(
      value.lifecycle,
    )
    || value.lifecycle.taskId
      !== task.taskId
    || !validateCheckpoint(
      value.checkpoint,
      task,
    )
    || !Array.isArray(
      value.events,
    )
    || value.events.length > 2048
    || value.events.some(
      (event, index) =>
        !isTaskEvent(event)
        || event.taskId !== task.taskId
        || event.sequence !== index,
    )
    || value.eventSequence
      !== value.events.length
    || !safeInteger(
      value.eventSequence,
    )
    || !safeInteger(
      value.storeRevision,
    )
    || !safeInteger(
      value.createdAtMs,
    )
    || !safeInteger(
      value.updatedAtMs,
    )
    || value.createdAtMs
      > value.updatedAtMs
  ) {
    return false;
  }

  return true;
}

function freezeCompletedStep(
  value,
) {
  return Object.freeze({
    stepId: value.stepId,
    stepIndex: value.stepIndex,
    outcome: value.outcome,
    completedAtMs:
      value.completedAtMs,
  });
}

function freezeRecord(value) {
  return Object.freeze({
    formatVersion:
      FORMAT_VERSION,
    task:
      parseComputerTaskEnvelope(
        value.task,
      ),
    lifecycle:
      Object.freeze({
        ...value.lifecycle,
      }),
    checkpoint:
      Object.freeze({
        revision:
          value.checkpoint.revision,
        nextStepIndex:
          value.checkpoint
            .nextStepIndex,
        completedSteps:
          Object.freeze(
            value.checkpoint
              .completedSteps
              .map(
                freezeCompletedStep,
              ),
          ),
        inFlightStep:
          value.checkpoint.inFlightStep
            ? Object.freeze({
                ...value.checkpoint
                  .inFlightStep,
              })
            : null,
        updatedAtMs:
          value.checkpoint.updatedAtMs,
      }),
    events:
      Object.freeze(
        value.events.map(
          (event) =>
            Object.freeze({
              ...event,
            }),
        ),
      ),
    eventSequence:
      value.eventSequence,
    storeRevision:
      value.storeRevision,
    createdAtMs:
      value.createdAtMs,
    updatedAtMs:
      value.updatedAtMs,
    integrityTag:
      value.integrityTag,
  });
}

function taskFileName(taskId) {
  if (!isTaskId(taskId)) {
    return null;
  }

  return taskId + '.json';
}

async function fsyncDirectory(
  directory,
) {
  let handle;

  try {
    handle = await fs.open(
      directory,
      'r',
    );
    await handle.sync();
  } finally {
    await handle?.close();
  }
}

async function atomicWriteJson(
  filePath,
  value,
) {
  const directory =
    path.dirname(filePath);
  const temporary =
    filePath
    + '.tmp-'
    + crypto.randomUUID();

  const body =
    JSON.stringify(
      value,
      null,
      2,
    )
    + '\n';

  let handle;

  try {
    handle = await fs.open(
      temporary,
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
      temporary,
      filePath,
    );
    await fs.chmod(
      filePath,
      0o600,
    );
    await fsyncDirectory(directory);
  } catch (error) {
    await handle?.close()
      .catch(() => {});
    await fs.unlink(temporary)
      .catch(() => {});
    throw error;
  }
}

export class TaskStoreCorruptionError
  extends Error {
  constructor(filePath) {
    super(
      'Invalid or corrupt durable task record: '
      + filePath,
    );
    this.name =
      'TaskStoreCorruptionError';
  }
}

export class DurableTaskStore {
  constructor(
    rootDirectory,
    {
      integrityKey,
    } = {},
  ) {
    if (
      typeof rootDirectory !== 'string'
      || rootDirectory.length === 0
    ) {
      throw new TypeError(
        'A durable store root is required.',
      );
    }

    this.integrityKey =
      normalizeIntegrityKey(
        integrityKey,
      );
    this.rootDirectory =
      path.resolve(rootDirectory);
    this.tasksDirectory =
      path.join(
        this.rootDirectory,
        'tasks',
      );
    this.taskLocks = new Map();
  }

  async withTaskLock(
    taskId,
    operation,
  ) {
    if (
      !isTaskId(taskId)
      || typeof operation !== 'function'
    ) {
      return operation();
    }

    const previous =
      this.taskLocks.get(taskId)
      ?? Promise.resolve();

    let release;
    const gate =
      new Promise((resolve) => {
        release = resolve;
      });
    const tail =
      previous.then(() => gate);

    this.taskLocks.set(
      taskId,
      tail,
    );

    await previous;

    try {
      return await operation();
    } finally {
      release();

      if (
        this.taskLocks.get(taskId)
          === tail
      ) {
        this.taskLocks.delete(taskId);
      }
    }
  }

  async init() {
    await fs.mkdir(
      this.tasksDirectory,
      {
        recursive: true,
        mode: 0o700,
      },
    );
    await fs.chmod(
      this.rootDirectory,
      0o700,
    );
    await fs.chmod(
      this.tasksDirectory,
      0o700,
    );
  }

  filePath(taskId) {
    const name = taskFileName(taskId);

    if (!name) {
      throw new TypeError(
        'Invalid task id.',
      );
    }

    return path.join(
      this.tasksDirectory,
      name,
    );
  }

  async get(taskId) {
    const filePath =
      this.filePath(taskId);

    let fileInfo;

    try {
      fileInfo =
        await fs.lstat(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return null;
      }

      throw error;
    }

    if (
      !fileInfo.isFile()
      || fileInfo.isSymbolicLink()
      || fileInfo.size < 2
      || fileInfo.size
        > MAX_RECORD_BYTES
    ) {
      throw new TaskStoreCorruptionError(
        filePath,
      );
    }

    let body;

    try {
      body = await fs.readFile(
        filePath,
        'utf8',
      );
    } catch {
      throw new TaskStoreCorruptionError(
        filePath,
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(body);
    } catch {
      throw new TaskStoreCorruptionError(
        filePath,
      );
    }

    if (
      !verifyRecordIntegrity(
        parsed,
        this.integrityKey,
      )
      || !validateRecord(parsed)
    ) {
      throw new TaskStoreCorruptionError(
        filePath,
      );
    }

    return freezeRecord(parsed);
  }

  async list() {
    await this.init();

    const names =
      await fs.readdir(
        this.tasksDirectory,
      );

    const records = [];

    for (
      const name of names.sort()
    ) {
      if (!name.endsWith('.json')) {
        continue;
      }

      const taskId =
        name.slice(0, -5);

      records.push(
        await this.get(taskId),
      );
    }

    return Object.freeze(records);
  }

  async create(
    task,
    lifecycle,
    trustedTimeMs,
  ) {
    return this.withTaskLock(
      task?.taskId,
      () => this.createUnlocked(
        task,
        lifecycle,
        trustedTimeMs,
      ),
    );
  }

  async updateLifecycle(
    taskId,
    event,
    trustedTimeMs,
  ) {
    return this.withTaskLock(
      taskId,
      () =>
        this.updateLifecycleUnlocked(
          taskId,
          event,
          trustedTimeMs,
        ),
    );
  }

  async markStepStarted(
    taskId,
    step,
    trustedTimeMs,
  ) {
    return this.withTaskLock(
      taskId,
      () =>
        this.markStepStartedUnlocked(
          taskId,
          step,
          trustedTimeMs,
        ),
    );
  }

  async checkpointStep(
    taskId,
    checkpoint,
    trustedTimeMs,
  ) {
    return this.withTaskLock(
      taskId,
      () =>
        this.checkpointStepUnlocked(
          taskId,
          checkpoint,
          trustedTimeMs,
        ),
    );
  }

  async appendEvent(
    taskId,
    event,
    trustedTimeMs,
  ) {
    return this.withTaskLock(
      taskId,
      () =>
        this.appendEventUnlocked(
          taskId,
          event,
          trustedTimeMs,
        ),
    );
  }

  async createUnlocked(
    task,
    lifecycle,
    trustedTimeMs,
  ) {
    await this.init();

    if (
      !parseComputerTaskEnvelope(task)
      || !isTaskLifecycle(lifecycle)
      || lifecycle.taskId
        !== task.taskId
      || !safeInteger(
        trustedTimeMs,
      )
    ) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record: null,
        reason: 'invalid_input',
      });
    }

    const existing =
      await this.get(task.taskId);

    if (existing) {
      const same =
        JSON.stringify(existing.task)
          === JSON.stringify(task);

      return Object.freeze({
        accepted: same,
        idempotent: same,
        record:
          same ? existing : null,
        reason:
          same
            ? 'duplicate'
            : 'task_conflict',
      });
    }

    const record = sealRecord({
      formatVersion:
        FORMAT_VERSION,
      task,
      lifecycle,
      checkpoint: {
        revision: 0,
        nextStepIndex: 0,
        completedSteps: [],
        inFlightStep: null,
        updatedAtMs:
          trustedTimeMs,
      },
      events: [],
      eventSequence: 0,
      storeRevision: 0,
      createdAtMs:
        trustedTimeMs,
      updatedAtMs:
        trustedTimeMs,
    }, this.integrityKey);

    if (!validateRecord(record)) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record: null,
        reason: 'invalid_input',
      });
    }

    const filePath =
      this.filePath(task.taskId);

    await atomicWriteJson(
      filePath,
      record,
    );

    return Object.freeze({
      accepted: true,
      idempotent: false,
      record:
        freezeRecord(record),
      reason: 'created',
    });
  }

  async updateLifecycleUnlocked(
    taskId,
    event,
    trustedTimeMs,
  ) {
    const record =
      await this.get(taskId);

    if (!record) {
      return Object.freeze({
        accepted: false,
        record: null,
        reason: 'not_found',
      });
    }

    const transition =
      transitionTaskLifecycle(
        record.lifecycle,
        event,
        trustedTimeMs,
      );

    if (!transition.accepted) {
      return Object.freeze({
        accepted: false,
        record,
        reason:
          transition.reason,
      });
    }

    if (
      transition.reason
        === 'duplicate'
    ) {
      return Object.freeze({
        accepted: true,
        record,
        reason: 'duplicate',
      });
    }

    const next = sealRecord({
      ...record,
      lifecycle:
        transition.next,
      storeRevision:
        record.storeRevision + 1,
      updatedAtMs:
        trustedTimeMs,
    }, this.integrityKey);

    if (!validateRecord(next)) {
      return Object.freeze({
        accepted: false,
        record,
        reason: 'invalid_record',
      });
    }

    await atomicWriteJson(
      this.filePath(taskId),
      next,
    );

    return Object.freeze({
      accepted: true,
      record:
        freezeRecord(next),
      reason: 'updated',
    });
  }


  async markStepStartedUnlocked(
    taskId,
    {
      stepIndex,
      stepId,
    },
    trustedTimeMs,
  ) {
    const record =
      await this.get(taskId);

    if (
      !record
      || !safeInteger(stepIndex)
      || typeof stepId !== 'string'
      || !safeInteger(
        trustedTimeMs,
      )
    ) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record,
        reason:
          record
            ? 'invalid_input'
            : 'not_found',
      });
    }

    const checkpoint =
      record.checkpoint;
    const existing =
      checkpoint.inFlightStep;

    if (existing) {
      const same =
        existing.stepIndex === stepIndex
        && existing.stepId === stepId;

      return Object.freeze({
        accepted: same,
        idempotent: same,
        record,
        reason:
          same
            ? 'duplicate'
            : 'in_flight_conflict',
      });
    }

    if (
      stepIndex
        !== checkpoint.nextStepIndex
      || stepIndex
        >= record.task.steps.length
      || record.task.steps[
        stepIndex
      ].stepId !== stepId
      || trustedTimeMs
        < checkpoint.updatedAtMs
    ) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record,
        reason: 'checkpoint_gap',
      });
    }

    const next = sealRecord({
      ...record,
      checkpoint: {
        ...checkpoint,
        revision:
          checkpoint.revision + 1,
        inFlightStep: {
          stepId,
          stepIndex,
          startedAtMs:
            trustedTimeMs,
        },
        updatedAtMs:
          trustedTimeMs,
      },
      storeRevision:
        record.storeRevision + 1,
      updatedAtMs:
        trustedTimeMs,
    }, this.integrityKey);

    if (!validateRecord(next)) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record,
        reason: 'invalid_record',
      });
    }

    await atomicWriteJson(
      this.filePath(taskId),
      next,
    );

    return Object.freeze({
      accepted: true,
      idempotent: false,
      record:
        freezeRecord(next),
      reason: 'started',
    });
  }

  async checkpointStepUnlocked(
    taskId,
    {
      stepIndex,
      stepId,
      outcome,
    },
    trustedTimeMs,
  ) {
    const record =
      await this.get(taskId);

    if (
      !record
      || !safeInteger(stepIndex)
      || typeof stepId !== 'string'
      || ![
        'succeeded',
        'failed',
        'failed_continued',
      ].includes(outcome)
      || !safeInteger(
        trustedTimeMs,
      )
    ) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record,
        reason:
          record
            ? 'invalid_input'
            : 'not_found',
      });
    }

    const checkpoint =
      record.checkpoint;

    if (
      stepIndex
        < checkpoint.nextStepIndex
    ) {
      const previous =
        checkpoint.completedSteps[
          stepIndex
        ];

      const same =
        previous?.stepId === stepId
        && previous?.outcome
          === outcome;

      return Object.freeze({
        accepted: same,
        idempotent: same,
        record,
        reason:
          same
            ? 'duplicate'
            : 'checkpoint_conflict',
      });
    }

    if (
      !checkpoint.inFlightStep
      || checkpoint.inFlightStep.stepIndex
        !== stepIndex
      || checkpoint.inFlightStep.stepId
        !== stepId
    ) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record,
        reason: 'step_not_started',
      });
    }

    if (
      stepIndex
        !== checkpoint.nextStepIndex
      || stepIndex
        >= record.task.steps.length
      || record.task.steps[
        stepIndex
      ].stepId !== stepId
      || trustedTimeMs
        < checkpoint.updatedAtMs
    ) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record,
        reason: 'checkpoint_gap',
      });
    }

    const nextCheckpoint = {
      revision:
        checkpoint.revision + 1,
      nextStepIndex:
        stepIndex + 1,
      completedSteps: [
        ...checkpoint.completedSteps,
        {
          stepId,
          stepIndex,
          outcome,
          completedAtMs:
            trustedTimeMs,
        },
      ],
      inFlightStep: null,
      updatedAtMs:
        trustedTimeMs,
    };

    const next = sealRecord({
      ...record,
      checkpoint:
        nextCheckpoint,
      storeRevision:
        record.storeRevision + 1,
      updatedAtMs:
        trustedTimeMs,
    }, this.integrityKey);

    if (!validateRecord(next)) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        record,
        reason: 'invalid_record',
      });
    }

    await atomicWriteJson(
      this.filePath(taskId),
      next,
    );

    return Object.freeze({
      accepted: true,
      idempotent: false,
      record:
        freezeRecord(next),
      reason: 'checkpointed',
    });
  }


  async appendEventUnlocked(
    taskId,
    {
      type,
      stepId = null,
      reason = null,
      outcome = null,
    },
    trustedTimeMs,
  ) {
    const record =
      await this.get(taskId);

    if (!record) {
      return Object.freeze({
        accepted: false,
        record: null,
        event: null,
        reason: 'not_found',
      });
    }

    if (
      !safeInteger(trustedTimeMs)
      || trustedTimeMs
        < record.updatedAtMs
      || record.events.length >= 2048
    ) {
      return Object.freeze({
        accepted: false,
        record,
        event: null,
        reason:
          record.events.length >= 2048
            ? 'event_limit'
            : 'invalid_time',
      });
    }

    const event =
      createTaskEvent({
        taskId,
        sequence:
          record.eventSequence,
        type,
        occurredAtMs:
          trustedTimeMs,
        stepId,
        reason,
        outcome,
      });

    if (!event) {
      return Object.freeze({
        accepted: false,
        record,
        event: null,
        reason: 'invalid_event',
      });
    }

    const next = sealRecord({
      ...record,
      events: [
        ...record.events,
        event,
      ],
      eventSequence:
        record.eventSequence + 1,
      storeRevision:
        record.storeRevision + 1,
      updatedAtMs:
        trustedTimeMs,
    }, this.integrityKey);

    if (!validateRecord(next)) {
      return Object.freeze({
        accepted: false,
        record,
        event: null,
        reason: 'invalid_record',
      });
    }

    await atomicWriteJson(
      this.filePath(taskId),
      next,
    );

    return Object.freeze({
      accepted: true,
      record:
        freezeRecord(next),
      event,
      reason: 'appended',
    });
  }

  async recoverInterrupted(
    trustedTimeMs,
  ) {
    if (!safeInteger(trustedTimeMs)) {
      throw new TypeError(
        'Invalid trusted recovery time.',
      );
    }

    const records =
      await this.list();
    const recovered = [];

    for (const record of records) {
      if (
        record.lifecycle.state
          !== 'running'
      ) {
        continue;
      }

      const uncertain =
        record.checkpoint.inFlightStep
          !== null;
      const lifecycleEvent =
        uncertain
          ? 'block'
          : 'pause';
      const auditType =
        uncertain
          ? 'recovery.blocked'
          : 'recovery.paused';

      const result =
        await this.updateLifecycle(
          record.task.taskId,
          lifecycleEvent,
          trustedTimeMs,
        );

      if (!result.accepted) {
        continue;
      }

      const audited =
        await this.appendEvent(
          record.task.taskId,
          {
            type: auditType,
            stepId:
              uncertain
                ? record.checkpoint
                    .inFlightStep.stepId
                : null,
            reason:
              uncertain
                ? 'uncertain_step'
                : 'interrupted',
          },
          trustedTimeMs,
        );

      recovered.push(
        audited.accepted
          ? audited.record
          : result.record,
      );
    }

    return Object.freeze(recovered);
  }
}
