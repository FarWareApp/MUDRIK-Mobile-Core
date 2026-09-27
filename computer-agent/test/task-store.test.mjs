import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  canonicalTaskPayload,
  parseComputerTaskEnvelope,
} from '../src/task-envelope.mjs';

import {
  createTaskLifecycle,
} from '../src/task-lifecycle.mjs';

import {
  DurableTaskStore,
  TaskStoreCorruptionError,
} from '../src/task-store.mjs';

const ACCOUNT =
  'acct_0123456789abcdef';
const DEVICE =
  'dev_0123456789abcdef';
const SIGNER =
  'skey_0123456789abcdef';
const TASK =
  'ctask_0123456789abcdef';
const NOW = 100_000;
const STORE_KEY = Buffer.alloc(32, 0x53);

const {
  privateKey,
} = crypto.generateKeyPairSync(
  'ed25519',
);

function signedTask(
  overrides = {},
) {
  const value = {
    protocolVersion: '1.0',
    taskId: TASK,
    accountId: ACCOUNT,
    deviceId: DEVICE,
    source: 'web',
    intent: 'Durable test',
    workspace: '/tmp/mudrik',
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    approval: null,
    createdAt:
      '2026-09-27T20:00:00.000Z',
    expiresAt:
      '2026-09-27T23:00:00.000Z',
    nonce:
      'nonce_0123456789abcdef',
    steps: [
      {
        stepId:
          'cstep_0123456789abcdef',
        tool: 'terminal',
        summary: 'First',
        requiredCapabilities: [
          'terminal.execute',
        ],
        input: {
          executable: process.execPath,
          args: ['--version'],
          cwd: '/tmp/mudrik',
        },
        continueOnError: false,
      },      {
        stepId:
          'cstep_1111111111111111',
        tool: 'terminal',
        summary: 'Second',
        requiredCapabilities: [
          'terminal.execute',
        ],
        input: {
          executable: process.execPath,
          args: ['--version'],
          cwd: '/tmp/mudrik',
        },
        continueOnError: true,
      },
    ],
    metadata: {},
    signerKeyId: SIGNER,
    signature: 'A'.repeat(86),
    ...overrides,
  };

  const payload =
    canonicalTaskPayload(value);

  const signed = {
    ...value,
    signature: crypto.sign(
      null,
      payload,
      privateKey,
    ).toString('base64url'),
  };

  const parsed =
    parseComputerTaskEnvelope(
      signed,
    );

  assert.ok(parsed);
  return parsed;
}

async function fixture() {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-task-store-',
      ),
    );

  const store =
    new DurableTaskStore(
      root,
      { integrityKey: STORE_KEY },
    );
  await store.init();

  const task = signedTask();
  const lifecycle =
    createTaskLifecycle(
      task.taskId,
      NOW,
    ).lifecycle;

  return {
    root,
    store,
    task,
    lifecycle,
  };
}

test(
  'durable store round trips a strict task record',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const created =
      await store.create(
        task,
        lifecycle,
        NOW,
      );

    assert.equal(created.accepted, true);
    assert.equal(
      created.reason,
      'created',
    );

    const loaded =
      await store.get(task.taskId);

    assert.ok(loaded);
    assert.equal(
      loaded.task.taskId,
      task.taskId,
    );
    assert.equal(
      loaded.lifecycle.state,
      'draft',
    );
    assert.equal(
      loaded.checkpoint
        .nextStepIndex,
      0,
    );
  },
);

test(
  'record file and directories use restrictive permissions',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );    await store.create(
      task,
      lifecycle,
      NOW,
    );

    const taskMode =
      (
        await fs.stat(
          store.filePath(
            task.taskId,
          ),
        )
      ).mode & 0o777;

    const rootMode =
      (
        await fs.stat(root)
      ).mode & 0o777;

    assert.equal(taskMode, 0o600);
    assert.equal(rootMode, 0o700);
  },
);

test(
  'same durable task create is idempotent while conflicting reuse fails',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    assert.equal(
      (
        await store.create(
          task,
          lifecycle,
          NOW,
        )
      ).accepted,
      true,
    );

    const duplicate =
      await store.create(
        task,
        lifecycle,
        NOW + 1,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.idempotent,
      true,
    );

    const other =
      signedTask({
        intent: 'Different durable task',
      });

    const conflict =
      await store.create(
        other,
        lifecycle,
        NOW + 3,
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'task_conflict',
    );
  },
);

test(
  'checkpoint progression is contiguous durable and idempotent',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    const started =
      await store.markStepStarted(
        task.taskId,
        {
          stepIndex: 0,
          stepId:
            task.steps[0].stepId,
        },
        NOW + 1,
      );

    assert.equal(started.accepted, true);

    const first =
      await store.checkpointStep(
        task.taskId,
        {
          stepIndex: 0,
          stepId:
            task.steps[0].stepId,
          outcome: 'succeeded',
        },
        NOW + 2,
      );

    assert.equal(first.accepted, true);
    assert.equal(
      first.record.checkpoint
        .nextStepIndex,
      1,
    );

    const duplicate =
      await store.checkpointStep(
        task.taskId,
        {
          stepIndex: 0,
          stepId:
            task.steps[0].stepId,
          outcome: 'succeeded',
        },
        NOW + 3,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.idempotent,
      true,
    );

    const conflict =
      await store.checkpointStep(
        task.taskId,
        {
          stepIndex: 0,
          stepId:
            task.steps[0].stepId,
          outcome:
            'failed_continued',
        },
        NOW + 2,
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'checkpoint_conflict',
    );

    const gap =
      await store.checkpointStep(
        task.taskId,
        {
          stepIndex: 1,
          stepId:
            task.steps[1].stepId,
          outcome: 'succeeded',
        },
        NOW,
      );

    assert.equal(gap.accepted, false);
    assert.equal(
      gap.reason,
      'step_not_started',
    );

    const startGap =
      await store.markStepStarted(
        task.taskId,
        {
          stepIndex: 2,
          stepId:
            task.steps[1].stepId,
        },
        NOW + 4,
      );

    assert.equal(
      startGap.accepted,
      false,
    );
    assert.equal(
      startGap.reason,
      'checkpoint_gap',
    );
  },
);

test(
  'reloading a new store instance preserves completed checkpoints',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );
    await store.markStepStarted(
      task.taskId,
      {
        stepIndex: 0,
        stepId:
          task.steps[0].stepId,
      },
      NOW + 1,
    );
    await store.checkpointStep(
      task.taskId,
      {
        stepIndex: 0,
        stepId:
          task.steps[0].stepId,
        outcome: 'succeeded',
      },
      NOW + 2,
    );

    const restarted =
      new DurableTaskStore(
      root,
      { integrityKey: STORE_KEY },
    );
    await restarted.init();

    const loaded =
      await restarted.get(
        task.taskId,
      );

    assert.equal(
      loaded.checkpoint
        .nextStepIndex,
      1,
    );
    assert.equal(
      loaded.checkpoint
        .completedSteps[0].stepId,
      task.steps[0].stepId,
    );
  },
);

test(
  'restart recovery pauses a task that was running',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );
    await store.updateLifecycle(
      task.taskId,
      'approve',
      NOW + 1,
    );
    await store.updateLifecycle(
      task.taskId,
      'queue',
      NOW + 2,
    );
    await store.updateLifecycle(
      task.taskId,
      'start',
      NOW + 3,
    );

    const restarted =
      new DurableTaskStore(
      root,
      { integrityKey: STORE_KEY },
    );
    const recovered =
      await restarted
        .recoverInterrupted(
          NOW + 4,
        );

    assert.equal(
      recovered.length,
      1,
    );
    assert.equal(
      recovered[0]
        .lifecycle.state,
      'paused',
    );

    const loaded =
      await restarted.get(
        task.taskId,
      );
    assert.equal(
      loaded.lifecycle.state,
      'paused',
    );
  },
);

test(
  'truncated or structurally corrupt record fails safely',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    await fs.writeFile(
      store.filePath(
        task.taskId,
      ),
      '{"formatVersion":1',
      'utf8',
    );

    await assert.rejects(
      () => store.get(task.taskId),
      TaskStoreCorruptionError,
    );
  },
);

test(
  'list ignores unrelated non-json files and validates every task file',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    await fs.writeFile(
      path.join(
        store.tasksDirectory,
        'notes.tmp',
      ),
      'ignored',
      'utf8',
    );

    const listed =
      await store.list();

    assert.equal(listed.length, 1);
    assert.equal(
      listed[0].task.taskId,
      task.taskId,
    );
  },
);

test(
  'durable event sequence is monotonic and sanitized',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    const first =
      await store.appendEvent(
        task.taskId,
        {
          type: 'task.admitted',
        },
        NOW + 1,
      );

    assert.equal(first.accepted, true);
    assert.equal(
      first.event.sequence,
      0,
    );

    const second =
      await store.appendEvent(
        task.taskId,
        {
          type: 'step.started',
          stepId:
            task.steps[0].stepId,
        },
        NOW + 2,
      );

    assert.equal(second.accepted, true);
    assert.equal(
      second.event.sequence,
      1,
    );

    const restarted =
      new DurableTaskStore(
      root,
      { integrityKey: STORE_KEY },
    );
    const loaded =
      await restarted.get(
        task.taskId,
      );

    assert.equal(
      loaded.events.length,
      2,
    );
    assert.equal(
      loaded.eventSequence,
      2,
    );

    const hostile =
      await restarted.appendEvent(
        task.taskId,
        {
          type: 'task.failed',
          reason:
            'raw secret text is not allowed',
        },
        NOW + 3,
      );

    assert.equal(hostile.accepted, false);
    assert.equal(
      hostile.reason,
      'invalid_event',
    );
  },
);

test(
  'checkpoint cannot complete a step that was never durably marked in flight',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    const result =
      await store.checkpointStep(
        task.taskId,
        {
          stepIndex: 0,
          stepId:
            task.steps[0].stepId,
          outcome: 'succeeded',
        },
        NOW + 1,
      );

    assert.equal(result.accepted, false);
    assert.equal(
      result.reason,
      'step_not_started',
    );
  },
);

test(
  'restart blocks an uncertain in-flight step instead of replaying it',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );
    await store.updateLifecycle(
      task.taskId,
      'approve',
      NOW + 1,
    );
    await store.updateLifecycle(
      task.taskId,
      'queue',
      NOW + 2,
    );
    await store.updateLifecycle(
      task.taskId,
      'start',
      NOW + 3,
    );
    await store.markStepStarted(
      task.taskId,
      {
        stepIndex: 0,
        stepId:
          task.steps[0].stepId,
      },
      NOW + 4,
    );

    const restarted =
      new DurableTaskStore(
      root,
      { integrityKey: STORE_KEY },
    );
    const recovered =
      await restarted
        .recoverInterrupted(
          NOW + 5,
        );

    assert.equal(
      recovered.length,
      1,
    );
    assert.equal(
      recovered[0].lifecycle.state,
      'blocked',
    );
    assert.equal(
      recovered[0]
        .checkpoint.inFlightStep
        .stepId,
      task.steps[0].stepId,
    );
    assert.equal(
      recovered[0]
        .events.at(-1).type,
      'recovery.blocked',
    );
    assert.equal(
      recovered[0]
        .events.at(-1).reason,
      'uncertain_step',
    );
  },
);

test(
  'concurrent event appends preserve every sequence without lost updates',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    const appends =
      Array.from(
        { length: 20 },
        () =>
          store.appendEvent(
            task.taskId,
            {
              type: 'task.admitted',
            },
            NOW + 1,
          ),
      );

    const results =
      await Promise.all(appends);

    assert.equal(
      results.every(
        (entry) => entry.accepted,
      ),
      true,
    );

    const loaded =
      await store.get(task.taskId);

    assert.equal(
      loaded.events.length,
      20,
    );
    assert.deepEqual(
      loaded.events.map(
        (entry) => entry.sequence,
      ),
      Array.from(
        { length: 20 },
        (_, index) => index,
      ),
    );
  },
);

test(
  'pause racing a checkpoint cannot be lost by a later durable write',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );
    await store.updateLifecycle(
      task.taskId,
      'approve',
      NOW + 1,
    );
    await store.updateLifecycle(
      task.taskId,
      'queue',
      NOW + 2,
    );
    await store.updateLifecycle(
      task.taskId,
      'start',
      NOW + 3,
    );
    await store.markStepStarted(
      task.taskId,
      {
        stepIndex: 0,
        stepId:
          task.steps[0].stepId,
      },
      NOW + 4,
    );

    const [paused, checkpointed] =
      await Promise.all([
        store.updateLifecycle(
          task.taskId,
          'pause',
          NOW + 5,
        ),
        store.checkpointStep(
          task.taskId,
          {
            stepIndex: 0,
            stepId:
              task.steps[0].stepId,
            outcome: 'succeeded',
          },
          NOW + 5,
        ),
      ]);

    assert.equal(paused.accepted, true);
    assert.equal(
      checkpointed.accepted,
      true,
    );

    const loaded =
      await store.get(task.taskId);

    assert.equal(
      loaded.lifecycle.state,
      'paused',
    );
    assert.equal(
      loaded.checkpoint
        .nextStepIndex,
      1,
    );
    assert.equal(
      loaded.checkpoint
        .inFlightStep,
      null,
    );
  },
);

test(
  'durable store requires a non-persisted strong integrity key',
  () => {
    assert.throws(
      () =>
        new DurableTaskStore(
          '/tmp/mudrik-no-key',
        ),
      /integrity key/i,
    );

    assert.throws(
      () =>
        new DurableTaskStore(
          '/tmp/mudrik-short-key',
          {
            integrityKey:
              Buffer.alloc(16),
          },
        ),
      /at least 32 bytes/i,
    );
  },
);

test(
  'wrong integrity key cannot read an existing durable task record',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    const wrongKeyStore =
      new DurableTaskStore(
        root,
        {
          integrityKey:
            Buffer.alloc(32, 0x99),
        },
      );

    await assert.rejects(
      () =>
        wrongKeyStore.get(
          task.taskId,
        ),
      TaskStoreCorruptionError,
    );
  },
);

test(
  'structurally valid lifecycle tampering is rejected by HMAC integrity',
  async (t) => {
    const {
      root,
      store,
      task,
      lifecycle,
    } = await fixture();

    t.after(
      () => fs.rm(
        root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    await store.create(
      task,
      lifecycle,
      NOW,
    );

    const file =
      store.filePath(task.taskId);
    const record =
      JSON.parse(
        await fs.readFile(
          file,
          'utf8',
        ),
      );

    record.lifecycle.state =
      'succeeded';
    record.lifecycle.revision = 9;
    record.lifecycle.updatedAtMs =
      NOW + 9;
    record.updatedAtMs =
      NOW + 9;

    await fs.writeFile(
      file,
      JSON.stringify(
        record,
        null,
        2,
      ) + '\n',
      {
        mode: 0o600,
      },
    );

    await assert.rejects(
      () => store.get(task.taskId),
      TaskStoreCorruptionError,
    );
  },
);
