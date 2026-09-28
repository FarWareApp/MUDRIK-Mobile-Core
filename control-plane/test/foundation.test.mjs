import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ApprovalRegistry,
} from '../src/approval-registry.mjs';

import {
  ControlDeviceRegistry,
} from '../src/device-registry.mjs';

import {
  ControlSessionRegistry,
} from '../src/source-session.mjs';

import {
  evaluateTaskFreshness,
  parseRoutedTask,
} from '../src/task-contract.mjs';

const ACCOUNT =
  'acct_0123456789abcdef';
const OTHER_ACCOUNT =
  'acct_1111111111111111';
const SOURCE =
  'dev_0123456789abcdef';
const DEST =
  'dev_1111111111111111';
const KEY =
  'dkey_0123456789abcdef';
const SESSION =
  'sess_0123456789abcdef';
const TASK =
  'ctask_0123456789abcdef';
const APPROVAL =
  'capproval_0123456789abcdef';
const NOW = 1_000_000;
const DIGEST =
  'a'.repeat(64);
const PAYLOAD =
  'b'.repeat(64);

function device(
  overrides = {},
) {
  return {
    deviceId: DEST,
    accountId: ACCOUNT,
    deviceKeyId: KEY,
    publicKeyThumbprint:
      'A'.repeat(43),
    state: 'active',
    agentVersion: '1.0.0',
    protocolMajor: 1,
    revision: 0,
    updatedAtMs: NOW - 100,
    ...overrides,
  };
}

function session(
  overrides = {},
) {
  return {
    sessionId: SESSION,
    accountId: ACCOUNT,
    deviceId: SOURCE,
    deviceKeyId: KEY,
    issuedAtMs: NOW - 1_000,
    expiresAtMs:
      NOW + 10_000,
    authenticatedAtMs:
      NOW - 1_000,
    assurance: 'verified',
    state: 'active',
    revision: 0,
    ...overrides,
  };
}

function routedTask(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    taskId: TASK,
    accountId: ACCOUNT,
    sourceSessionId:
      SESSION,
    sourceDeviceId:
      SOURCE,
    destinationDeviceId:
      DEST,
    issuedAtMs: NOW - 100,
    expiresAtMs:
      NOW + 10_000,
    nonce:
      'nonce_0123456789abcdef',
    sequence: 1,
    requestedCapabilities: [
      'filesystem.read',
    ],
    scopeDigest: DIGEST,
    payloadDigest: PAYLOAD,
    approvalId: APPROVAL,
    risk: 'high',
    policyVersion:
      'policy_control.v1',
    ...overrides,
  };
}

function approval(
  overrides = {},
) {
  return {
    approvalId: APPROVAL,
    accountId: ACCOUNT,
    sourceSessionId:
      SESSION,
    destinationDeviceId:
      DEST,
    taskId: TASK,
    capabilities: [
      'filesystem.read',
    ],
    scopeDigest: DIGEST,
    risk: 'high',
    policyVersion:
      'policy_control.v1',
    mode: 'single_use',
    state: 'active',
    createdAtMs:
      NOW - 500,
    expiresAtMs:
      NOW + 5_000,
    consumedAtMs: null,
    revision: 0,
    ...overrides,
  };
}

test(
  'device registry authorizes only active same-account supported devices',
  () => {
    const registry =
      new ControlDeviceRegistry({
        verifyEnrollment:
          () => true,
      });

    const added =
      registry.register(
        device(),
      );

    assert.equal(
      added.accepted,
      true,
    );

    assert.equal(
      registry
        .authorizeDestination({
          accountId: ACCOUNT,
          deviceId: DEST,
        }).allowed,
      true,
    );

    assert.equal(
      registry
        .authorizeDestination({
          accountId:
            OTHER_ACCOUNT,
          deviceId: DEST,
        }).reason,
      'destination_account_mismatch',
    );

    const revoked =
      registry.updateState({
        deviceId: DEST,
        expectedRevision: 0,
        nextState: 'revoked',
        trustedNowMs: NOW,
      });

    assert.equal(
      revoked.accepted,
      true,
    );

    assert.equal(
      registry
        .authorizeDestination({
          accountId: ACCOUNT,
          deviceId: DEST,
        }).reason,
      'destination_revoked',
    );

    assert.equal(
      registry.updateState({
        deviceId: DEST,
        expectedRevision: 1,
        nextState: 'active',
        trustedNowMs:
          NOW + 1,
      }).accepted,
      false,
    );
  },
);

test(
  'device id replay is idempotent only for the exact record',
  () => {
    const registry =
      new ControlDeviceRegistry({
        verifyEnrollment:
          () => true,
      });

    assert.equal(
      registry.register(
        device(),
      ).duplicate,
      false,
    );
    assert.equal(
      registry.register(
        device(),
      ).duplicate,
      true,
    );
    assert.equal(
      registry.register(
        device({
          accountId:
            OTHER_ACCOUNT,
        }),
      ).reason,
      'device_id_conflict',
    );
  },
);

test(
  'source session authorization follows Section 3 identity lifetime and revocation rules',
  () => {
    const registry =
      new ControlSessionRegistry({
        verifySession:
          () => true,
      });

    assert.equal(
      registry.register(
        session(),
      ).accepted,
      true,
    );

    assert.equal(
      registry.authorize({
        sessionId: SESSION,
        accountId: ACCOUNT,
        deviceId: SOURCE,
        trustedNowMs: NOW,
      }).allowed,
      true,
    );

    assert.equal(
      registry.authorize({
        sessionId: SESSION,
        accountId:
          OTHER_ACCOUNT,
        deviceId: SOURCE,
        trustedNowMs: NOW,
      }).reason,
      'source_account_mismatch',
    );

    assert.equal(
      registry.revoke({
        sessionId: SESSION,
        expectedRevision: 0,
      }).accepted,
      true,
    );

    assert.equal(
      registry.authorize({
        sessionId: SESSION,
        accountId: ACCOUNT,
        deviceId: SOURCE,
        trustedNowMs: NOW,
      }).reason,
      'source_session_revoked',
    );
  },
);

test(
  'routed task parser is exact capability-bound and freshness is trusted-time based',
  () => {
    const parsed =
      parseRoutedTask(
        routedTask(),
      );

    assert.ok(parsed);

    assert.equal(
      evaluateTaskFreshness(
        parsed,
        NOW,
      ).allowed,
      true,
    );

    assert.equal(
      parseRoutedTask({
        ...routedTask(),
        hiddenAuthority: true,
      }),
      null,
    );

    assert.equal(
      parseRoutedTask(
        routedTask({
          requestedCapabilities: [
            'filesystem.read',
            'filesystem.read',
          ],
        }),
      ),
      null,
    );

    assert.equal(
      parseRoutedTask(
        routedTask({
          requestedCapabilities: [
            'unknown.power',
          ],
        }),
      ),
      null,
    );

    assert.equal(
      evaluateTaskFreshness(
        parsed,
        parsed.expiresAtMs,
      ).reason,
      'task_expired',
    );
  },
);

test(
  'approval is exact-task bound and single-use consumption is idempotent only for that task',
  () => {
    const registry =
      new ApprovalRegistry();

    assert.equal(
      registry.register(
        approval(),
      ).accepted,
      true,
    );

    const task =
      parseRoutedTask(
        routedTask(),
      );

    const first =
      registry.authorizeTask({
        approvalId: APPROVAL,
        task,
        trustedNowMs: NOW,
      });

    assert.equal(
      first.allowed,
      true,
    );
    assert.equal(
      first.reason,
      'approval_consumed',
    );

    const duplicate =
      registry.authorizeTask({
        approvalId: APPROVAL,
        task,
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

    const wrongTask =
      parseRoutedTask(
        routedTask({
          taskId:
            'ctask_1111111111111111',
        }),
      );

    assert.equal(
      registry.authorizeTask({
        approvalId: APPROVAL,
        task: wrongTask,
        trustedNowMs:
          NOW + 2,
      }).reason,
      'approval_binding_mismatch',
    );
  },
);

test(
  'critical approvals must be single-use and wrong scope cannot authorize',
  () => {
    const registry =
      new ApprovalRegistry();

    assert.equal(
      registry.register(
        approval({
          risk: 'critical',
          mode:
            'task_lifetime',
        }),
      ).accepted,
      false,
    );

    assert.equal(
      registry.register(
        approval({
          approvalId:
            'capproval_1111111111111111',
        }),
      ).accepted,
      true,
    );

    const wrongScope =
      parseRoutedTask(
        routedTask({
          approvalId:
            'capproval_1111111111111111',
          scopeDigest:
            'c'.repeat(64),
        }),
      );

    assert.equal(
      registry.authorizeTask({
        approvalId:
          'capproval_1111111111111111',
        task: wrongScope,
        trustedNowMs: NOW,
      }).reason,
      'approval_binding_mismatch',
    );
  },
);

test(
  'copied device and session metadata never become trusted without authoritative verification',
  () => {
    const deniedDevices =
      new ControlDeviceRegistry({
        verifyEnrollment:
          () => false,
      });

    assert.equal(
      deniedDevices.register(
        device(),
      ).reason,
      'device_identity_unverified',
    );

    const throwingDevices =
      new ControlDeviceRegistry({
        verifyEnrollment() {
          throw new Error(
            'verifier unavailable',
          );
        },
      });

    assert.equal(
      throwingDevices.register(
        device(),
      ).reason,
      'device_identity_unverified',
    );

    const deniedSessions =
      new ControlSessionRegistry({
        verifySession:
          () => false,
      });

    assert.equal(
      deniedSessions.register(
        session(),
      ).reason,
      'session_identity_unverified',
    );
  },
);
