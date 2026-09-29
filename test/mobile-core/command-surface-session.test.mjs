import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  CommandSurfaceActionRegistry,
  parseCommandSurfaceActionEnvelope,
  parseCommandSurfaceSession,
} = loadTypeScriptModule(
  'src/core/commandSurface/surfaceSession.ts',
);

const ACCOUNT =
  'acct_1111111111111111';
const OTHER_ACCOUNT =
  'acct_2222222222222222';
const DEVICE =
  'dev_1111111111111111';
const OTHER_DEVICE =
  'dev_2222222222222222';
const SESSION =
  'surfsess_1111111111111111';
const SURFACE =
  'surf_1111111111111111';
const TASK =
  'ctask_1111111111111111';
const APPROVAL =
  'capproval_1111111111111111';
const NOW = 10_000;

function session(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    surfaceSessionId: SESSION,
    surfaceInstanceId: SURFACE,
    surfaceType: 'web',
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    authenticatedAtMs: NOW,
    expiresAtMs: NOW + 60_000,
    revision: 3,
    grantsAuthority: false,
    ...overrides,
  };
}

function envelope(
  actionKind,
  sequence,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    surfaceSessionId: SESSION,
    surfaceInstanceId: SURFACE,
    surfaceType: 'web',
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    actionKind,
    sequence,
    issuedAtMs: NOW + sequence,
    sessionRevision: 3,
    grantsAuthority: false,
    ...overrides,
  };
}

function composer(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    destinationDeviceId: DEVICE,
    instruction: 'Run bounded tests',
    capabilityHints: [
      'terminal.execute',
    ],
    projectRef: null,
    issuedAtMs: NOW + 1,
    grantsAuthority: false,
    ...overrides,
  };
}

function control(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    expectedRevision: 9,
    action: 'cancel',
    issuedAtMs: NOW + 2,
    grantsAuthority: false,
    ...overrides,
  };
}

function approval(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    accountId: ACCOUNT,
    approvalId: APPROVAL,
    taskId: TASK,
    destinationDeviceId: DEVICE,
    expectedApprovalRevision: 4,
    decision: 'approve',
    issuedAtMs: NOW + 3,
    grantsAuthority: false,
    ...overrides,
  };
}

test(
  'surface session and action envelope are strict authority-free contracts',
  () => {
    const parsedSession =
      parseCommandSurfaceSession(
        session(),
      );
    const parsedEnvelope =
      parseCommandSurfaceActionEnvelope(
        envelope(
          'task_compose',
          1,
        ),
      );

    assert.ok(parsedSession);
    assert.ok(parsedEnvelope);
    assert.equal(
      parsedSession.grantsAuthority,
      false,
    );
    assert.equal(
      parsedEnvelope.grantsAuthority,
      false,
    );

    assert.equal(
      parseCommandSurfaceSession({
        ...session(),
        approvalGranted: true,
      }),
      null,
    );
    assert.equal(
      parseCommandSurfaceActionEnvelope({
        ...envelope(
          'task_compose',
          1,
        ),
        capabilityGrant:
          'filesystem.write',
      }),
      null,
    );
  },
);

test(
  'same session accepts ordered actions and exact replay is idempotent',
  () => {
    const registry =
      new CommandSurfaceActionRegistry();

    const firstEnvelope =
      envelope(
        'task_compose',
        1,
      );
    const firstIntent =
      composer();

    const first =
      registry.admit(
        session(),
        firstEnvelope,
        firstIntent,
        NOW + 10,
      );

    assert.equal(
      first.accepted,
      true,
    );
    assert.equal(
      first.duplicate,
      false,
    );

    const duplicate =
      registry.admit(
        session(),
        firstEnvelope,
        firstIntent,
        NOW + 11,
      );

    assert.equal(
      duplicate.accepted,
      true,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );

    const second =
      registry.admit(
        session(),
        envelope(
          'task_control',
          2,
        ),
        control(),
        NOW + 12,
      );

    assert.equal(
      second.accepted,
      true,
    );
  },
);

test(
  'same sequence with changed action conflicts and cannot be replayed as new authority',
  () => {
    const registry =
      new CommandSurfaceActionRegistry();

    registry.admit(
      session(),
      envelope(
        'task_compose',
        1,
      ),
      composer(),
      NOW + 10,
    );

    const conflict =
      registry.admit(
        session(),
        envelope(
          'task_control',
          1,
        ),
        control(),
        NOW + 11,
      );

    assert.equal(
      conflict.accepted,
      false,
    );
    assert.equal(
      conflict.reason,
      'sequence_conflict',
    );
  },
);

test(
  'sequence gaps and stale actions fail closed',
  () => {
    const registry =
      new CommandSurfaceActionRegistry();

    const gap =
      registry.admit(
        session(),
        envelope(
          'task_control',
          2,
        ),
        control(),
        NOW + 10,
      );

    assert.equal(
      gap.accepted,
      false,
    );
    assert.equal(
      gap.reason,
      'sequence_gap',
    );

    registry.admit(
      session(),
      envelope(
        'task_compose',
        1,
      ),
      composer(),
      NOW + 11,
    );

    registry.admit(
      session(),
      envelope(
        'task_control',
        2,
      ),
      control(),
      NOW + 12,
    );

    const stale =
      registry.admit(
        session(),
        envelope(
          'task_compose',
          1,
        ),
        composer(),
        NOW + 13,
      );

    assert.equal(
      stale.accepted,
      false,
    );
    assert.equal(
      stale.reason,
      'sequence_stale',
    );
  },
);

test(
  'stale tab session revision and expired session fail before intent routing',
  () => {
    const registry =
      new CommandSurfaceActionRegistry();

    const staleRevision =
      registry.admit(
        session({
          revision: 4,
        }),
        envelope(
          'task_control',
          1,
          {
            sessionRevision: 3,
          },
        ),
        control(),
        NOW + 10,
      );

    assert.equal(
      staleRevision.accepted,
      false,
    );
    assert.equal(
      staleRevision.reason,
      'stale_session_revision',
    );

    const expired =
      registry.admit(
        session({
          expiresAtMs:
            NOW + 5,
        }),
        envelope(
          'task_control',
          1,
          {
            issuedAtMs:
              NOW + 4,
          },
        ),
        control(),
        NOW + 5,
      );

    assert.equal(
      expired.accepted,
      false,
    );
    assert.equal(
      expired.reason,
      'session_expired',
    );
  },
);

test(
  'cross-account cross-device and cross-surface identity manipulation fail closed',
  () => {
    const registry =
      new CommandSurfaceActionRegistry();

    for (const changed of [
      {
        accountId:
          OTHER_ACCOUNT,
      },
      {
        sourceDeviceId:
          OTHER_DEVICE,
      },
      {
        surfaceInstanceId:
          'surf_2222222222222222',
      },
      {
        surfaceType:
          'mobile',
      },
    ]) {
      const result =
        registry.admit(
          session(),
          envelope(
            'task_control',
            1,
            changed,
          ),
          control(),
          NOW + 10,
        );

      assert.equal(
        result.accepted,
        false,
      );
      assert.equal(
        result.reason,
        'identity_mismatch',
      );
    }
  },
);

test(
  'intent account identity must match authenticated surface session',
  () => {
    const registry =
      new CommandSurfaceActionRegistry();

    for (
      const [
        kind,
        intent,
      ] of [
        [
          'task_compose',
          composer({
            accountId:
              OTHER_ACCOUNT,
          }),
        ],
        [
          'task_control',
          control({
            accountId:
              OTHER_ACCOUNT,
          }),
        ],
        [
          'approval_decision',
          approval({
            accountId:
              OTHER_ACCOUNT,
          }),
        ],
      ]
    ) {
      const result =
        registry.admit(
          session(),
          envelope(
            kind,
            1,
          ),
          intent,
          NOW + 10,
        );

      assert.equal(
        result.accepted,
        false,
      );
      assert.equal(
        result.reason,
        'identity_mismatch',
      );
    }
  },
);

test(
  'action kind cannot reinterpret another intent shape',
  () => {
    const registry =
      new CommandSurfaceActionRegistry();

    const result =
      registry.admit(
        session(),
        envelope(
          'approval_decision',
          1,
        ),
        control(),
        NOW + 10,
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'invalid_action',
    );
  },
);
