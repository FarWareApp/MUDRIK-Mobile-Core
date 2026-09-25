import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const stateModule =
  loadTypeScriptModule(
    'src/core/emergency/emergencyGuardianState.ts',
  );

const NOW = 100_000;

function state(overrides = {}) {
  return {
    phase: 'normal',
    generation: 0,
    enteredAtMs: 90_000,
    ...overrides,
  };
}

function transition(
  currentState,
  event,
  now = NOW,
) {
  return stateModule
    .transitionEmergencyGuardian(
      {
        state: currentState,
        event,
      },
      now,
    );
}

test(
  'state machine plans only and never performs an external emergency action',
  () => {
    const result =
      transition(
        state(),
        'risk_critical',
      );

    assert.equal(result.accepted, true);
    assert.equal(
      result.next.phase,
      'critical',
    );
    assert.deepEqual(
      result.plannedActions,
      ['present_urgent_ui'],
    );
    assert.equal(
      result.grantsAuthority,
      false,
    );
    assert.equal(
      result.performsExternalAction,
      false,
    );
  },
);

test(
  'normal cannot jump directly to escalating',
  () => {
    const result =
      transition(
        state(),
        'begin_escalation',
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'invalid_event',
    );
    assert.equal(
      result.next.phase,
      'normal',
    );
  },
);

test(
  'critical requires a separate begin escalation transition',
  () => {
    const critical =
      transition(
        state(),
        'risk_critical',
      );

    const escalating =
      transition(
        critical.next,
        'begin_escalation',
        NOW + 1,
      );

    assert.equal(
      escalating.accepted,
      true,
    );
    assert.equal(
      escalating.next.phase,
      'escalating',
    );
    assert.deepEqual(
      escalating.plannedActions,
      ['prepare_escalation'],
    );
    assert.equal(
      escalating.performsExternalAction,
      false,
    );
  },
);

test(
  'explicit urgent risk may bypass watch but still does not escalate externally',
  () => {
    const result =
      transition(
        state(),
        'risk_urgent',
      );

    assert.equal(
      result.next.phase,
      'urgent',
    );
    assert.deepEqual(
      result.plannedActions,
      ['present_urgent_ui'],
    );
    assert.equal(
      result.performsExternalAction,
      false,
    );
  },
);

test(
  'user cancellation exits critical or escalating into a fresh check',
  () => {
    for (const phase of [
      'critical',
      'escalating',
    ]) {
      const result =
        transition(
          state({ phase }),
          'user_cancel',
        );

      assert.equal(
        result.next.phase,
        'check_user',
      );
      assert.deepEqual(
        result.plannedActions,
        [
          'cancel_pending_escalation',
          'prompt_user',
        ],
      );
      assert.equal(
        result.performsExternalAction,
        false,
      );
    }
  },
);

test(
  'user confirmation resolves active risk states',
  () => {
    for (const phase of [
      'normal',
      'watch',
      'check_user',
      'urgent',
      'critical',
    ]) {
      const result =
        transition(
          state({ phase }),
          'user_ok',
        );

      assert.equal(
        result.next.phase,
        'resolved',
      );
      assert.equal(
        result.accepted,
        true,
      );
    }
  },
);

test(
  'resolved is terminal until explicit reset and reset advances generation',
  () => {
    const resolved =
      state({
        phase: 'resolved',
        generation: 4,
      });

    const repeat =
      transition(
        resolved,
        'resolve',
      );

    assert.equal(
      repeat.reason,
      'idempotent',
    );

    const reset =
      transition(
        resolved,
        'reset',
        NOW + 1,
      );

    assert.equal(
      reset.next.phase,
      'normal',
    );
    assert.equal(
      reset.next.generation,
      5,
    );
    assert.equal(
      reset.next.enteredAtMs,
      NOW + 1,
    );
  },
);

test(
  'reset outside resolved state fails closed',
  () => {
    for (const phase of [
      'normal',
      'watch',
      'check_user',
      'urgent',
      'critical',
      'escalating',
    ]) {
      const result =
        transition(
          state({ phase }),
          'reset',
        );

      assert.equal(
        result.accepted,
        false,
      );
      assert.equal(
        result.reason,
        'invalid_event',
      );
    }
  },
);

test(
  'future state time and invalid trusted time fail closed',
  () => {
    const future =
      transition(
        state({
          enteredAtMs: NOW + 1,
        }),
        'risk_watch',
      );

    assert.equal(
      future.accepted,
      false,
    );
    assert.equal(
      future.reason,
      'non_monotonic_time',
    );

    const invalidTime =
      stateModule
        .transitionEmergencyGuardian(
          {
            state: state(),
            event: 'risk_watch',
          },
          Number.NaN,
        );

    assert.equal(
      invalidTime.accepted,
      false,
    );
    assert.equal(
      invalidTime.reason,
      'invalid_input',
    );
  },
);

test(
  'unknown fields malformed states and unknown events fail closed',
  () => {
    const hidden =
      stateModule
        .transitionEmergencyGuardian(
          {
            state: state(),
            event: 'risk_watch',
            forceCall: true,
          },
          NOW,
        );

    assert.equal(
      hidden.accepted,
      false,
    );
    assert.equal(
      hidden.reason,
      'invalid_input',
    );

    const malformed =
      transition(
        {
          ...state(),
          authority: 'emergency.call',
        },
        'risk_watch',
      );

    assert.equal(
      malformed.reason,
      'invalid_input',
    );

    const unknown =
      transition(
        state(),
        'diagnose_and_call',
      );

    assert.equal(
      unknown.reason,
      'invalid_event',
    );
  },
);

test(
  'generation exhaustion cannot wrap a resolved session',
  () => {
    const result =
      transition(
        state({
          phase: 'resolved',
          generation:
            Number.MAX_SAFE_INTEGER,
        }),
        'reset',
      );

    assert.equal(
      result.accepted,
      false,
    );
    assert.equal(
      result.reason,
      'generation_exhausted',
    );
    assert.equal(
      result.next.generation,
      Number.MAX_SAFE_INTEGER,
    );
  },
);
