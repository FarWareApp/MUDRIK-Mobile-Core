import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  applyAgentTaskEvent,
  parseAgentTaskEvent,
} from '../src/agent-event.mjs';

import {
  ApprovalRegistry,
} from '../src/approval-registry.mjs';

import {
  BoundedDeliveryQueue,
  createResumeCursor,
} from '../src/delivery-queue.mjs';

import {
  ControlDeviceRegistry,
} from '../src/device-registry.mjs';

import {
  PresenceRegistry,
} from '../src/presence.mjs';

import {
  ControlSessionRegistry,
} from '../src/source-session.mjs';

import {
  createControlTaskRecord,
  transitionControlTask,
} from '../src/task-state.mjs';

import {
  parseRoutedTask,
} from '../src/task-contract.mjs';

import {
  TaskAdmissionRegistry,
} from '../../computer-agent/src/task-admission.mjs';

import {
  canonicalTaskPayload,
} from '../../computer-agent/src/task-envelope.mjs';

import {
  ComputerTaskRunner,
} from '../../computer-agent/src/task-runner.mjs';

const NOW = 9_000_000;
const ACCOUNT =
  'acct_5555555555555555';
const SOURCE =
  'dev_5555555555555555';
const DEST =
  'dev_6666666666666666';
const SESSION =
  'sess_5555555555555555';
const KEY =
  'dkey_5555555555555555';
const TASK =
  'ctask_5555555555555555';
const APPROVAL =
  'capproval_5555555555555555';
const DELIVERY =
  'cpdelivery_5555555555555555';
const CANCEL_DELIVERY =
  'cpdelivery_6666666666666666';
const CONNECTION =
  'cpconn_5555555555555555';

function routedTask(
  overrides = {},
) {
  return parseRoutedTask({
    protocolVersion: '1.0',
    taskId: TASK,
    accountId: ACCOUNT,
    sourceSessionId:
      SESSION,
    sourceDeviceId:
      SOURCE,
    destinationDeviceId:
      DEST,
    issuedAtMs:
      NOW - 100,
    expiresAtMs:
      NOW + 100_000,
    nonce:
      'nonce_5555555555555555',
    sequence: 1,
    requestedCapabilities: [
      'terminal.execute',
    ],
    scopeDigest:
      'a'.repeat(64),
    payloadDigest:
      'b'.repeat(64),
    approvalId:
      APPROVAL,
    risk: 'high',
    policyVersion:
      'policy_control.v1',
    ...overrides,
  });
}

function move(
  record,
  event,
  options = {},
) {
  const result =
    transitionControlTask(
      record,
      event,
      {
        expectedRevision:
          record.revision,
        trustedNowMs:
          record.updatedAtMs + 1,
        ...options,
      },
    );

  assert.equal(
    result.accepted,
    true,
    result.reason,
  );

  return result.record;
}

function deliveredRecord() {
  let record =
    createControlTaskRecord(
      routedTask(),
      NOW,
    );

  for (const event of [
    'authenticate',
    'authorize',
    'queue',
  ]) {
    record = move(
      record,
      event,
    );
  }

  return move(
    record,
    'deliver',
    {
      deliveryId: DELIVERY,
    },
  );
}

function agentEvent(
  sequence,
  type,
  deliveryId = DELIVERY,
) {
  return {
    protocolVersion: '1.0',
    eventId:
      'cpevent_'
      + String(sequence)
        .padStart(16, '0'),
    taskId: TASK,
    deviceId: DEST,
    sequence,
    type,
    deliveryId,
    reasonCode: null,
  };
}

function deviceRecord() {
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
    updatedAtMs:
      NOW - 100,
  };
}

function sessionRecord() {
  return {
    sessionId: SESSION,
    accountId: ACCOUNT,
    deviceId: SOURCE,
    deviceKeyId: KEY,
    issuedAtMs:
      NOW - 1_000,
    expiresAtMs:
      NOW + 100_000,
    authenticatedAtMs:
      NOW - 1_000,
    assurance: 'verified',
    state: 'active',
    revision: 0,
  };
}

function approvalRecord() {
  return {
    approvalId: APPROVAL,
    accountId: ACCOUNT,
    sourceSessionId:
      SESSION,
    destinationDeviceId:
      DEST,
    taskId: TASK,
    capabilities: [
      'terminal.execute',
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

function signedLocalEnvelope() {
  const {
    publicKey,
    privateKey,
  } = crypto.generateKeyPairSync(
    'ed25519',
  );
  const localNow =
    Date.parse(
      '2026-09-29T14:00:00.000Z',
    );

  const base = {
    protocolVersion: '1.0',
    taskId: TASK,
    accountId: ACCOUNT,
    deviceId: DEST,
    source: 'web',
    intent:
      'Execute routed terminal task',
    workspace: '/tmp/mudrik',
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    approval: null,
    createdAt:
      '2026-09-29T14:00:00.000Z',
    expiresAt:
      '2026-09-29T15:00:00.000Z',
    nonce:
      'nonce_5555555555555555',
    steps: [{
      stepId:
        'cstep_5555555555555555',
      tool: 'terminal',
      summary:
        'Run bounded command',
      requiredCapabilities: [
        'terminal.execute',
      ],
      input: {
        executable:
          process.execPath,
        args: ['--version'],
        cwd: '/tmp/mudrik',
      },
      continueOnError: false,
    }],
    metadata: {},
    signerKeyId:
      'skey_5555555555555555',
    signature: 'A'.repeat(86),
  };

  const payload =
    canonicalTaskPayload(base);

  assert.ok(payload);

  const envelope = {
    ...base,
    signature:
      crypto.sign(
        null,
        payload,
        privateKey,
      ).toString('base64url'),
  };

  return {
    envelope,
    publicKey,
    localNow,
  };
}

test(
  'reconnect redelivery remains one logical task at local agent admission',
  () => {
    const queue =
      new BoundedDeliveryQueue();
    const record =
      deliveredRecord();

    assert.equal(
      queue.enqueue(
        'task',
        record,
        {
          deliveryId: DELIVERY,
          trustedNowMs:
            record.updatedAtMs + 1,
        },
      ).accepted,
      true,
    );

    const cursor =
      createResumeCursor({
        deviceId: DEST,
        sequence: 0,
        issuedAtMs:
          NOW + 10,
      });

    const firstRoute =
      queue.resume(
        cursor,
        NOW + 11,
      );
    const secondRoute =
      queue.resume(
        cursor,
        NOW + 12,
      );

    assert.equal(
      firstRoute.entries[0].taskId,
      TASK,
    );
    assert.equal(
      secondRoute.entries[0].taskId,
      TASK,
    );

    const {
      envelope,
      publicKey,
      localNow,
    } = signedLocalEnvelope();

    const admission =
      new TaskAdmissionRegistry({
        accountId: ACCOUNT,
        deviceId: DEST,
        trustedSigners: [{
          signerKeyId:
            envelope.signerKeyId,
          accountId: ACCOUNT,
          publicKey,
        }],
      });

    const first =
      admission.admit(
        envelope,
        localNow + 1_000,
      );
    const duplicate =
      admission.admit(
        envelope,
        localNow + 2_000,
      );

    assert.equal(first.accepted, true);
    assert.equal(
      first.idempotent,
      false,
    );
    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.idempotent,
      true,
    );
  },
);

test(
  'cancel racing an unacknowledged delivery replaces transport work and late execution cannot overwrite terminal truth',
  () => {
    const queue =
      new BoundedDeliveryQueue();
    let record =
      deliveredRecord();

    queue.enqueue(
      'task',
      record,
      {
        deliveryId: DELIVERY,
        trustedNowMs:
          record.updatedAtMs + 1,
      },
    );

    record = move(
      record,
      'cancel',
      {
        reason: 'user_cancel',
      },
    );

    const control =
      queue.enqueue(
        'cancel',
        record,
        {
          deliveryId:
            CANCEL_DELIVERY,
          trustedNowMs:
            record.updatedAtMs + 1,
        },
      );

    assert.equal(
      control.superseded,
      true,
    );

    const replay =
      queue.resume(
        createResumeCursor({
          deviceId: DEST,
          sequence: 0,
          issuedAtMs:
            NOW + 20,
        }),
        NOW + 21,
      );

    assert.equal(
      replay.entries.length,
      1,
    );
    assert.equal(
      replay.entries[0].kind,
      'cancel',
    );

    const late =
      applyAgentTaskEvent(
        record,
        agentEvent(
          1,
          'execution_started',
          DELIVERY,
        ),
        record.updatedAtMs + 1,
      );

    assert.equal(
      late.accepted,
      false,
    );
    assert.equal(
      record.state,
      'cancelled',
    );
  },
);

test(
  'presence can remain online while revoked source session and destination device authorization fail closed',
  () => {
    const devices =
      new ControlDeviceRegistry({
        verifyEnrollment:
          () => true,
      });
    const sessions =
      new ControlSessionRegistry({
        verifySession:
          () => true,
      });
    const presence =
      new PresenceRegistry();

    assert.equal(
      devices.register(
        deviceRecord(),
      ).accepted,
      true,
    );
    assert.equal(
      sessions.register(
        sessionRecord(),
      ).accepted,
      true,
    );
    assert.equal(
      presence.connect(
        {
          deviceId: DEST,
          connectionId:
            CONNECTION,
        },
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      sessions.revoke({
        sessionId: SESSION,
        expectedRevision: 0,
      }).accepted,
      true,
    );

    assert.equal(
      devices.updateState({
        deviceId: DEST,
        expectedRevision: 0,
        nextState: 'revoked',
        trustedNowMs:
          NOW + 1,
      }).accepted,
      true,
    );

    assert.equal(
      presence.get(
        DEST,
        NOW + 2,
      ).state,
      'online',
    );

    assert.equal(
      sessions.authorize({
        sessionId: SESSION,
        accountId: ACCOUNT,
        deviceId: SOURCE,
        trustedNowMs:
          NOW + 2,
      }).allowed,
      false,
    );

    assert.equal(
      devices
        .authorizeDestination({
          accountId: ACCOUNT,
          deviceId: DEST,
        }).allowed,
      false,
    );
  },
);

test(
  'control-plane approval never creates a local capability grant or bypasses local signature verification',
  async () => {
    const approvals =
      new ApprovalRegistry();

    assert.equal(
      approvals.register(
        approvalRecord(),
      ).accepted,
      true,
    );

    const route =
      routedTask();

    assert.equal(
      approvals.authorizeTask({
        approvalId: APPROVAL,
        task: route,
        trustedNowMs: NOW,
      }).allowed,
      true,
    );

    let adapterCalls = 0;
    const runner =
      new ComputerTaskRunner({
        grants: [],
        terminalSandbox: {
          async run() {
            adapterCalls += 1;
            return {
              exitCode: 0,
              signal: null,
              timedOut: false,
              aborted: false,
              stdout: '',
              stderr: '',
              stdoutTruncated:
                false,
              stderrTruncated:
                false,
            };
          },
        },
      });

    const localTask = {
      taskId: TASK,
      deviceId: DEST,
      intent:
        'Control plane approved but local grant absent',
      risk: 'medium',
      requestedCapabilities: [
        'terminal.execute',
      ],
      expiresAt:
        new Date(
          Date.now()
          + 600_000,
        ).toISOString(),
      steps: [{
        stepId: 'step-local',
        tool: 'terminal',
        summary:
          'Must remain blocked',
        requiredCapabilities: [
          'terminal.execute',
        ],
        input: {
          executable:
            process.execPath,
          args: ['--version'],
          cwd: process.cwd(),
        },
      }],
    };

    const blocked =
      await runner.run(localTask);

    assert.equal(
      blocked.status,
      'blocked',
    );
    assert.equal(adapterCalls, 0);

    const {
      envelope,
      publicKey,
      localNow,
    } = signedLocalEnvelope();

    const admission =
      new TaskAdmissionRegistry({
        accountId: ACCOUNT,
        deviceId: DEST,
        trustedSigners: [{
          signerKeyId:
            envelope.signerKeyId,
          accountId: ACCOUNT,
          publicKey,
        }],
      });

    const tampered = {
      ...envelope,
      intent:
        'tampered after route approval',
    };

    assert.equal(
      admission.admit(
        tampered,
        localNow + 1_000,
      ).reason,
      'invalid_signature',
    );
  },
);

test(
  'malformed protocol injection and malicious sequence values fail closed',
  () => {
    const base = {
      protocolVersion: '1.0',
      taskId: TASK,
      accountId: ACCOUNT,
      sourceSessionId:
        SESSION,
      sourceDeviceId:
        SOURCE,
      destinationDeviceId:
        DEST,
      issuedAtMs:
        NOW - 100,
      expiresAtMs:
        NOW + 100_000,
      nonce:
        'nonce_5555555555555555',
      sequence: 1,
      requestedCapabilities: [
        'terminal.execute',
      ],
      scopeDigest:
        'a'.repeat(64),
      payloadDigest:
        'b'.repeat(64),
      approvalId:
        APPROVAL,
      risk: 'high',
      policyVersion:
        'policy_control.v1',
    };

    const malformed = [
      {
        ...base,
        protocolVersion: '2.0',
      },
      {
        ...base,
        hiddenAuthority: true,
      },
      {
        ...base,
        sequence:
          Number.MAX_SAFE_INTEGER
          + 1,
      },
      {
        ...base,
        metadata: {
          token:
            'private-content',
        },
      },
      {
        ...base,
        requestedCapabilities: [
          'terminal.execute',
          'terminal.execute',
        ],
      },
    ];

    for (const candidate of malformed) {
      assert.equal(
        parseRoutedTask(
          candidate,
        ),
        null,
      );
    }

    assert.equal(
      parseAgentTaskEvent({
        ...agentEvent(
          1,
          'delivery_ack',
        ),
        hiddenAuthority: true,
      }),
      null,
    );

    assert.equal(
      parseAgentTaskEvent(
        agentEvent(
          Number.MAX_SAFE_INTEGER
            + 1,
          'delivery_ack',
        ),
      ),
      null,
    );
  },
);
