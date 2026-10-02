import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  evaluateInstructionFirewall,
} = loadTypeScriptModule(
  'src/core/security/instructionFirewall.ts',
);

const NOW = 3_400_000_000;

function candidate(overrides = {}) {
  return {
    instructionRef:
      'instruction_ref_1111111111111111',
    sourceKind: 'requester_input',
    authority: 'requester',
    actionClass: 'tool',
    capability: 'filesystem.read',
    provenanceRef:
      'provenance_ref_1111111111111111',
    observedAtMs: NOW - 100,
    expiresAtMs: NOW + 10_000,
    ...overrides,
  };
}

test('requester action can proceed only through capability checks', () => {
  assert.deepEqual(
    evaluateInstructionFirewall(
      candidate(),
      NOW,
    ),
    {
      allowed: true,
      treatAsData: false,
      requiresCapabilityCheck: true,
      reason: 'requester_action_request',
    },
  );
});

test('web file tool and integration instructions are always data', () => {
  for (const sourceKind of [
    'web_content',
    'file_content',
    'tool_output',
    'integration_content',
    'knowledge',
    'memory',
  ]) {
    const decision =
      evaluateInstructionFirewall(
        candidate({
          sourceKind,
          authority: 'none',
          actionClass: 'execute',
          capability:
            'terminal.execute',
        }),
        NOW,
      );

    assert.equal(decision.allowed, false);
    assert.equal(
      decision.treatAsData,
      true,
    );
    assert.equal(
      decision.reason,
      'non_authoritative_data',
    );
  }
});

test('external content cannot forge requester or platform authority', () => {
  assert.equal(
    evaluateInstructionFirewall(
      candidate({
        sourceKind: 'web_content',
        authority: 'requester',
      }),
      NOW,
    ).reason,
    'invalid_binding',
  );

  assert.equal(
    evaluateInstructionFirewall(
      candidate({
        sourceKind: 'tool_output',
        authority: 'platform',
      }),
      NOW,
    ).reason,
    'invalid_binding',
  );
});

test('requester cannot self-grant policy capability or credential authority', () => {
  for (const actionClass of [
    'credential',
    'policy_change',
    'capability_change',
  ]) {
    const decision =
      evaluateInstructionFirewall(
        candidate({
          actionClass,
          capability:
            actionClass === 'credential'
              ? 'secret.use'
              : null,
        }),
        NOW,
      );

    assert.equal(decision.allowed, false);
    assert.equal(
      decision.reason,
      'privilege_escalation_forbidden',
    );
  }
});

test('platform policy is authoritative only from platform source', () => {
  assert.deepEqual(
    evaluateInstructionFirewall(
      candidate({
        sourceKind: 'platform_policy',
        authority: 'platform',
        actionClass: 'policy_change',
        capability: null,
      }),
      NOW,
    ),
    {
      allowed: true,
      treatAsData: false,
      requiresCapabilityCheck: false,
      reason: 'authoritative_instruction',
    },
  );
});

test('expired instruction cannot authorize work', () => {
  const decision =
    evaluateInstructionFirewall(
      candidate({
        observedAtMs: NOW - 20_000,
        expiresAtMs: NOW,
      }),
      NOW,
    );

  assert.equal(decision.allowed, false);
  assert.equal(
    decision.reason,
    'expired_instruction',
  );
});
