import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DurableApprovalRegistry,
} from '../src/durable-approval-registry.mjs';

import {
  parseRoutedTask,
} from '../src/task-contract.mjs';

const NOW = 12_000_000;
const APPROVAL =
  'capproval_7777777777777777';
const TASK =
  'ctask_7777777777777777';

function approval() {
  return {
    approvalId: APPROVAL,
    accountId:
      'acct_7777777777777777',
    sourceSessionId:
      'sess_7777777777777777',
    destinationDeviceId:
      'dev_8888888888888888',
    taskId: TASK,
    capabilities: [
      'filesystem.read',
    ],
    scopeDigest:
      'a'.repeat(64),
    risk: 'high',
    policyVersion:
      'policy_control.v1',
    mode: 'single_use',
    state: 'active',
    createdAtMs:
      NOW - 500,
    expiresAtMs:
      NOW + 50_000,
    consumedAtMs: null,
    revision: 0,
  };
}

function task() {
  return parseRoutedTask({
    protocolVersion: '1.0',
    taskId: TASK,
    accountId:
      'acct_7777777777777777',
    sourceSessionId:
      'sess_7777777777777777',
    sourceDeviceId:
      'dev_7777777777777777',
    destinationDeviceId:
      'dev_8888888888888888',
    issuedAtMs:
      NOW - 100,
    expiresAtMs:
      NOW + 40_000,
    nonce:
      'nonce_7777777777777777',
    sequence: 1,
    requestedCapabilities: [
      'filesystem.read',
    ],
    scopeDigest:
      'a'.repeat(64),
    payloadDigest:
      'b'.repeat(64),
    approvalId: APPROVAL,
    risk: 'high',
    policyVersion:
      'policy_control.v1',
  });
}

async function fixture(t) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-approval-',
      ),
    );

  t.after(
    () => fs.rm(
      root,
      {
        recursive: true,
        force: true,
      },
    ),
  );

  const directory =
    path.join(
      root,
      'approvals',
    );
  const key =
    Buffer.alloc(
      32,
      0x77,
    );
  const registry =
    await new DurableApprovalRegistry({
      directory,
      integrityKey: key,
    }).init();

  return {
    root,
    directory,
    key,
    registry,
  };
}

test(
  'one-shot approval consumption survives registry restart and remains idempotent for the bound task',
  async (t) => {
    const f = await fixture(t);

    assert.equal(
      (
        await f.registry.register(
          approval(),
        )
      ).accepted,
      true,
    );

    const first =
      await f.registry
        .authorizeTask({
          approvalId: APPROVAL,
          task: task(),
          trustedNowMs: NOW,
        });

    assert.equal(first.allowed, true);
    assert.equal(
      first.duplicate,
      false,
    );
    assert.equal(
      first.record.state,
      'consumed',
    );

    const restarted =
      await new DurableApprovalRegistry({
        directory: f.directory,
        integrityKey: f.key,
      }).init();

    const duplicate =
      await restarted
        .authorizeTask({
          approvalId: APPROVAL,
          task: task(),
          trustedNowMs:
            NOW + 1,
        });

    assert.equal(
      duplicate.allowed,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );
    assert.equal(
      duplicate.record.state,
      'consumed',
    );
  },
);

test(
  'concurrent one-shot authorization serializes to one consumption plus one duplicate',
  async (t) => {
    const f = await fixture(t);

    await f.registry.register(
      approval(),
    );

    const [a, b] =
      await Promise.all([
        f.registry.authorizeTask({
          approvalId: APPROVAL,
          task: task(),
          trustedNowMs: NOW,
        }),
        f.registry.authorizeTask({
          approvalId: APPROVAL,
          task: task(),
          trustedNowMs: NOW,
        }),
      ]);

    assert.equal(a.allowed, true);
    assert.equal(b.allowed, true);
    assert.equal(
      Number(a.duplicate === true)
      + Number(b.duplicate === true),
      1,
    );

    const durable =
      await f.registry.get(
        APPROVAL,
      );

    assert.equal(
      durable.state,
      'consumed',
    );
    assert.equal(
      durable.revision,
      1,
    );
  },
);

test(
  'durable approval registry detects tamper and wrong integrity key',
  async (t) => {
    const f = await fixture(t);

    await f.registry.register(
      approval(),
    );

    const wrong =
      await new DurableApprovalRegistry({
        directory: f.directory,
        integrityKey:
          Buffer.alloc(
            32,
            0x11,
          ),
      }).init();

    await assert.rejects(
      () => wrong.get(APPROVAL),
      /approval_store_integrity_failed/,
    );

    const file =
      f.registry.filePath(
        APPROVAL,
      );
    const envelope =
      JSON.parse(
        await fs.readFile(
          file,
          'utf8',
        ),
      );

    envelope.record.state =
      'consumed';
    envelope.record.consumedAtMs =
      NOW;
    envelope.record.revision = 1;

    await fs.writeFile(
      file,
      JSON.stringify(
        envelope,
        null,
        2,
      ) + '\n',
      {
        mode: 0o600,
      },
    );

    await assert.rejects(
      () =>
        f.registry.get(
          APPROVAL,
        ),
      /approval_store_integrity_failed/,
    );
  },
);

test(
  'wrong task binding cannot reuse a durable approval after restart',
  async (t) => {
    const f = await fixture(t);

    await f.registry.register(
      approval(),
    );

    const wrongTask =
      parseRoutedTask({
        ...task(),
        taskId:
          'ctask_8888888888888888',
      });

    const result =
      await f.registry
        .authorizeTask({
          approvalId: APPROVAL,
          task: wrongTask,
          trustedNowMs: NOW,
        });

    assert.equal(
      result.allowed,
      false,
    );
    assert.equal(
      result.reason,
      'approval_binding_mismatch',
    );
  },
);
