import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DurableComputerAgentRuntime,
} from '../src/durable-runtime.mjs';

import {
  canonicalTaskPayload,
} from '../src/task-envelope.mjs';

import {
  DurableTaskStore,
} from '../src/task-store.mjs';

const ACCOUNT =
  'acct_0123456789abcdef';
const DEVICE =
  'dev_0123456789abcdef';
const SIGNER =
  'skey_0123456789abcdef';
const TASK =
  'ctask_0123456789abcdef';
const NOW =
  Date.parse('2026-09-27T20:00:00.000Z');
const STORE_KEY = Buffer.alloc(32, 0x44);

const {
  publicKey,
  privateKey,
} = crypto.generateKeyPairSync(
  'ed25519',
);

function tickingClock(
  start = NOW + 1_000,
) {
  let current = start;

  return () => {
    current += 1;
    return current;
  };
}

function grant(
  root,
  overrides = {},
) {
  return {
    grantId:
      'grant-terminal-runtime',
    deviceId: DEVICE,
    capability:
      'terminal.execute',
    mode: 'session',
    scope: {
      filesystemRoots: [root],
      executables: [
        process.execPath,
      ],
    },
    createdAt:
      '2026-09-27T19:00:00.000Z',
    expiresAt:
      '2026-09-27T23:00:00.000Z',
    ...overrides,
  };
}

function unsignedTask(
  root,
  sideEffectFile,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    taskId: TASK,
    accountId: ACCOUNT,
    deviceId: DEVICE,
    source: 'web',
    intent:
      'Run durable bounded steps',
    workspace: root,
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    approval: null,
    createdAt:
      '2026-09-27T20:00:00.000Z',
    expiresAt:
      '2026-09-27T22:00:00.000Z',
    nonce:
      'nonce_0123456789abcdef',    steps: [
      {
        stepId:
          'cstep_0123456789abcdef',
        tool: 'terminal',
        summary:
          'Persist first side effect',
        requiredCapabilities: [
          'terminal.execute',
        ],
        input: {
          executable:
            process.execPath,
          args: [
            '-e',
            'require("fs").appendFileSync('
              + JSON.stringify(
                sideEffectFile,
              )
              + ', "one\\n")',
          ],
          cwd: root,
        },
        continueOnError: false,
      },
      {
        stepId:
          'cstep_1111111111111111',
        tool: 'terminal',
        summary:
          'Persist second side effect',
        requiredCapabilities: [
          'terminal.execute',
        ],
        input: {
          executable:
            process.execPath,
          args: [
            '-e',
            'require("fs").appendFileSync('
              + JSON.stringify(
                sideEffectFile,
              )
              + ', "two\\n")',
          ],
          cwd: root,
        },
        continueOnError: false,
      },
    ],
    metadata: {},
    signerKeyId: SIGNER,
    signature: 'A'.repeat(86),
    ...overrides,
  };
}

function signedTask(
  root,
  sideEffectFile,
  overrides = {},
) {
  const value =
    unsignedTask(
      root,
      sideEffectFile,
      overrides,
    );
  const payload =
    canonicalTaskPayload(value);

  assert.ok(payload);

  return {
    ...value,
    signature: crypto
      .sign(
        null,
        payload,
        privateKey,
      )
      .toString('base64url'),
  };
}

async function fixture({
  grants,
  onEvent,
  clock,
} = {}) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-runtime-',
      ),
    );
  const sideEffectFile =
    path.join(
      root,
      'effects.log',
    );
  const store =
    new DurableTaskStore(
      path.join(
        root,
        'state',
      ),
      {
        integrityKey: STORE_KEY,
      },
    );
  const runtime =
    new DurableComputerAgentRuntime({
      accountId: ACCOUNT,
      deviceId: DEVICE,
      trustedSigners: [{
        signerKeyId: SIGNER,
        accountId: ACCOUNT,
        publicKey,
      }],
      store,
      grants:
        grants ?? [grant(root)],
      clock:
        clock ?? tickingClock(),
      onEvent,
    });

  return {
    root,
    sideEffectFile,
    store,
    runtime,
  };
}

test(
  'signed durable task executes once and checkpoints every completed step',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    const admitted =
      await f.runtime.admit(task);

    assert.equal(
      admitted.accepted,
      true,
    );
    assert.equal(
      admitted.reason,
      'admitted',
    );

    const executed =
      await f.runtime.run(
        task.taskId,
      );

    assert.equal(
      executed.accepted,
      true,
    );
    assert.equal(
      executed.status,
      'succeeded',
    );

    const record =
      await f.runtime.getTask(
        task.taskId,
      );
    assert.equal(
      record.checkpoint
        .nextStepIndex,
      2,
    );
    assert.equal(
      record.checkpoint
        .inFlightStep,
      null,
    );
    assert.deepEqual(
      record.checkpoint
        .completedSteps
        .map((entry) => entry.outcome),
      [
        'succeeded',
        'succeeded',
      ],
    );

    const effects =
      await fs.readFile(
        f.sideEffectFile,
        'utf8',
      );

    assert.equal(
      effects,
      'one\ntwo\n',
    );
  },
);

test(
  'restart restores task provenance and never replays a succeeded task',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    await f.runtime.admit(task);
    const first =
      await f.runtime.run(
        task.taskId,
      );

    assert.equal(
      first.status,
      'succeeded',
    );
    const restarted =
      new DurableComputerAgentRuntime({
        accountId: ACCOUNT,
        deviceId: DEVICE,
        trustedSigners: [{
          signerKeyId: SIGNER,
          accountId: ACCOUNT,
          publicKey,
        }],
        store:
          new DurableTaskStore(
            path.join(
              f.root,
              'state',
            ),
            {
              integrityKey: STORE_KEY,
            },
          ),
        grants: [grant(f.root)],
        clock: tickingClock(
          NOW + 5_000,
        ),
      });

    const initialized =
      await restarted.init();

    assert.equal(
      initialized.restored,
      1,
    );

    const duplicate =
      await restarted.run(
        task.taskId,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.status,
      'succeeded',
    );
    assert.equal(
      duplicate.reason,
      'duplicate',
    );

    const effects =
      await fs.readFile(
        f.sideEffectFile,
        'utf8',
      );

    assert.equal(
      effects,
      'one\ntwo\n',
    );
  },
);

test(
  'grant revocation between steps blocks the next step before execution',
  async (t) => {
    let runtime;
    let revoked = false;

    const f =
      await fixture({
        onEvent: (event) => {
          if (
            runtime
            && !revoked
            && event.type
              === 'step.checkpointed'
            && event.stepId
              === 'cstep_0123456789abcdef'
          ) {
            revoked = true;
            runtime.setGrants([
              grant(f.root, {
                revokedAt:
                  '2026-09-27T20:00:01.000Z',
              }),
            ]);
          }
        },
      });

    runtime = f.runtime;

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    await runtime.admit(task);

    const result =
      await runtime.run(
        task.taskId,
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.status,
      'blocked',
    );
    assert.equal(
      result.reason,
      'approval-required',
    );
    const effects =
      await fs.readFile(
        f.sideEffectFile,
        'utf8',
      );

    assert.equal(effects, 'one\n');

    const record =
      await runtime.getTask(
        task.taskId,
      );

    assert.equal(
      record.checkpoint
        .nextStepIndex,
      1,
    );
    assert.equal(
      record.checkpoint
        .inFlightStep,
      null,
    );

    runtime.setGrants([
      grant(f.root),
    ]);

    const resumed =
      await runtime.resume(
        task.taskId,
      );

    assert.equal(
      resumed.accepted,
      true,
    );
    assert.equal(
      resumed.status,
      'queued',
    );

    const finished =
      await runtime.run(
        task.taskId,
      );

    assert.equal(
      finished.accepted,
      true,
    );
    assert.equal(
      finished.status,
      'succeeded',
    );

    assert.equal(
      await fs.readFile(
        f.sideEffectFile,
        'utf8',
      ),
      'one\ntwo\n',
    );
  },
);

test(
  'missing grants leave a durable approval state and later authorization can continue',
  async (t) => {
    const f =
      await fixture({
        grants: [],
      });

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    await f.runtime.admit(task);

    const blocked =
      await f.runtime.run(
        task.taskId,
      );

    assert.equal(
      blocked.accepted,
      false,
    );
    assert.equal(
      blocked.status,
      'awaiting_approval',
    );
    assert.equal(
      blocked.reason,
      'approval-required',
    );

    f.runtime.setGrants([
      grant(f.root),
    ]);

    const continued =
      await f.runtime.run(
        task.taskId,
      );

    assert.equal(
      continued.accepted,
      true,
    );
    assert.equal(
      continued.status,
      'succeeded',
    );
  },
);

test(
  'duplicate signed delivery after admission is idempotent and cannot reset progress',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    const first =
      await f.runtime.admit(task);
    const second =
      await f.runtime.admit(task);

    assert.equal(first.accepted, true);
    assert.equal(second.accepted, true);
    assert.equal(
      second.reason,
      'duplicate',
    );

    const before =
      await f.runtime.getTask(
        task.taskId,
      );

    assert.equal(
      before.lifecycle.state,
      'draft',
    );
    assert.equal(
      before.checkpoint
        .nextStepIndex,
      0,
    );
  },
);

test(
  'tampered persisted task fails runtime restore before execution',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    await f.runtime.admit(task);

    const file =
      f.store.filePath(
        task.taskId,
      );
    const record =
      JSON.parse(
        await fs.readFile(
          file,
          'utf8',
        ),
      );

    record.task.intent =
      'tampered after signature';

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

    const restarted =
      new DurableComputerAgentRuntime({
        accountId: ACCOUNT,
        deviceId: DEVICE,
        trustedSigners: [{
          signerKeyId: SIGNER,
          accountId: ACCOUNT,
          publicKey,
        }],
        store:
          new DurableTaskStore(
            path.join(
              f.root,
              'state',
            ),
            {
              integrityKey: STORE_KEY,
            },
          ),
        grants: [grant(f.root)],
        clock:
          tickingClock(
            NOW + 5_000,
          ),
      });

    await assert.rejects(
      () => restarted.init(),
      /Invalid or corrupt durable task record/,
    );
  },
);

test(
  'restart restores nonce replay protection across task identities',
  async (t) => {
    const f = await fixture();

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const firstTask =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    await f.runtime.admit(firstTask);

    const restarted =
      new DurableComputerAgentRuntime({
        accountId: ACCOUNT,
        deviceId: DEVICE,
        trustedSigners: [{
          signerKeyId: SIGNER,
          accountId: ACCOUNT,
          publicKey,
        }],
        store:
          new DurableTaskStore(
            path.join(
              f.root,
              'state',
            ),
            {
              integrityKey: STORE_KEY,
            },
          ),
        grants: [grant(f.root)],
        clock:
          tickingClock(
            NOW + 5_000,
          ),
      });

    await restarted.init();

    const replay =
      signedTask(
        f.root,
        f.sideEffectFile,
        {
          taskId:
            'ctask_2222222222222222',
        },
      );

    const result =
      await restarted.admit(replay);

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'nonce_replay',
    );
  },
);

function longRunningTask(
  root,
  sideEffectFile,
  overrides = {},
) {
  return signedTask(
    root,
    sideEffectFile,
    {
      steps: [{
        stepId:
          'cstep_3333333333333333',
        tool: 'terminal',
        summary:
          'Run cancellable bounded process',
        requiredCapabilities: [
          'terminal.execute',
        ],
        input: {
          executable:
            process.execPath,
          args: [
            '-e',
            'setTimeout(() => {}, 5000)',
          ],
          cwd: root,
          timeoutMs: 10_000,
        },
        continueOnError: false,
      }],
      ...overrides,
    },
  );
}

function waitForEvent(
  predicate,
) {
  let resolve;

  const promise =
    new Promise((done) => {
      resolve = done;
    });

  return {
    promise,
    handler(event) {
      if (predicate(event)) {
        resolve(event);
      }
    },
  };
}

test(
  'pause is durable before abort and interrupted in-flight work cannot auto-resume',
  async (t) => {
    const started =
      waitForEvent(
        (event) =>
          event.type === 'step.started',
      );
    const f =
      await fixture({
        onEvent:
          started.handler,
      });

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      longRunningTask(
        f.root,
        f.sideEffectFile,
      );

    await f.runtime.admit(task);

    const running =
      f.runtime.run(task.taskId);

    await started.promise;
    await new Promise(
      (resolve) =>
        setTimeout(resolve, 50),
    );

    const paused =
      await f.runtime.pause(
        task.taskId,
      );

    assert.equal(
      paused.accepted,
      true,
    );
    assert.equal(
      paused.status,
      'paused',
    );

    const execution =
      await running;

    assert.equal(
      execution.accepted,
      false,
    );
    assert.equal(
      execution.reason,
      'execution_aborted',
    );

    const record =
      await f.runtime.getTask(
        task.taskId,
      );

    assert.equal(
      record.lifecycle.state,
      'paused',
    );
    assert.equal(
      record.checkpoint
        .inFlightStep.stepId,
      task.steps[0].stepId,
    );

    const resumed =
      await f.runtime.resume(
        task.taskId,
      );

    assert.equal(
      resumed.accepted,
      false,
    );
    assert.equal(
      resumed.reason,
      'uncertain_step',
    );
  },
);

test(
  'cancel persists terminal cancellation before aborting active work',
  async (t) => {
    const started =
      waitForEvent(
        (event) =>
          event.type === 'step.started',
      );
    const f =
      await fixture({
        onEvent:
          started.handler,
      });

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      longRunningTask(
        f.root,
        f.sideEffectFile,
        {
          taskId:
            'ctask_3333333333333333',
          nonce:
            'nonce_3333333333333333',
        },
      );

    await f.runtime.admit(task);

    const running =
      f.runtime.run(task.taskId);

    await started.promise;
    await new Promise(
      (resolve) =>
        setTimeout(resolve, 50),
    );

    const cancelled =
      await f.runtime.cancel(
        task.taskId,
      );

    assert.equal(
      cancelled.accepted,
      true,
    );
    assert.equal(
      cancelled.status,
      'cancelled',
    );

    const execution =
      await running;

    assert.equal(
      execution.accepted,
      false,
    );
    assert.equal(
      execution.reason,
      'execution_aborted',
    );

    const record =
      await f.runtime.getTask(
        task.taskId,
      );

    assert.equal(
      record.lifecycle.state,
      'cancelled',
    );

    const rerun =
      await f.runtime.run(
        task.taskId,
      );

    assert.equal(rerun.accepted, false);
    assert.equal(
      rerun.reason,
      'terminal_state',
    );
  },
);

test(
  'observer failures cannot interrupt durable execution',
  async (t) => {
    const f =
      await fixture({
        onEvent: () => {
          throw new Error(
            'observer must be isolated',
          );
        },
      });

    t.after(
      () => fs.rm(
        f.root,
        {
          recursive: true,
          force: true,
        },
      ),
    );

    const task =
      signedTask(
        f.root,
        f.sideEffectFile,
      );

    const admitted =
      await f.runtime.admit(task);

    assert.equal(
      admitted.accepted,
      true,
    );

    const executed =
      await f.runtime.run(
        task.taskId,
      );

    assert.equal(
      executed.accepted,
      true,
    );
    assert.equal(
      executed.status,
      'succeeded',
    );

    const record =
      await f.runtime.getTask(
        task.taskId,
      );

    assert.equal(
      record.lifecycle.state,
      'succeeded',
    );
    assert.ok(
      record.events.length >= 7,
    );
  },
);
