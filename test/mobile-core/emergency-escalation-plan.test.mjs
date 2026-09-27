import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const planModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEscalationPlan.ts',
);
const routeModule = loadTypeScriptModule(
  'src/core/emergency/emergencyRoute.ts',
);
const eventRegistryModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEventRegistry.ts',
);
const riskModule = loadTypeScriptModule(
  'src/core/emergency/emergencyRiskAssessment.ts',
);
const sessionRegistryModule = loadTypeScriptModule(
  'src/core/emergency/emergencySessionRegistry.ts',
);
const sessionStateModule = loadTypeScriptModule(
  'src/core/emergency/emergencyGuardianSessionState.ts',
);
const responsivenessModule = loadTypeScriptModule(
  'src/core/emergency/emergencyResponsivenessCheck.ts',
);

const NOW = 100_000;
const ACCOUNT = 'acct_0123456789abcdef';
const DEVICE = 'dev_0123456789abcdef';
const KEY = 'dkey_0123456789abcdef';
const THUMB = 'A'.repeat(43);
function config(overrides = {}) {
  return {
    configId: 'egc_0123456789abcdef',
    accountId: ACCOUNT,
    revision: 0,
    enabled: true,
    mode: 'simulation',
    automaticEscalation: true,
    responsivenessTimeoutMs: 10_000,
    escalationCountdownMs: 15_000,
    evidenceSources: [
      'responsiveness',
      'motion',
      'heart_rate',
    ],
    emergencyContactRefs: [
      'emc_0123456789abcdef',
      'emc_1111111111111111',
    ],
    shareLocation: false,
    medicalProfileRef: null,
    shareMedicalProfile: false,
    updatedAtMs: 90_000,
    ...overrides,
  };
}
function trust() {
  return {
    device: {
      deviceId: DEVICE,
      accountId: ACCOUNT,
      deviceKeyId: KEY,
      publicKeyThumbprint: THUMB,
      state: 'active',
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: DEVICE,
    expectedDeviceKeyId: KEY,
    expectedPublicKeyThumbprint: THUMB,
  };
}

function evidence(id, overrides = {}) {
  return {
    emergencySessionId:
      'ems_0123456789abcdef',
    evidenceId: id,
    sequence: 0,
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    kind: 'motion',
    finding: 'fall_detected',
    observedAtMs: 109_000,
    confidence: 0.9,
    sensorId: 'sens_0123456789abcdef',
    ...overrides,
  };
}
const CAPABILITY = {
  motion: 'health.read.motion',
  heart_rate: 'health.read.heart_rate',
};

function candidate(value) {
  const capability =
    CAPABILITY[value.kind] ?? null;

  return {
    evidence: value,
    collectorDeviceTrustInput: trust(),
    capabilityGrants: capability
      ? [{
          grantId:
            'grant-' + value.evidenceId,
          subjectId: DEVICE,
          capability,
          scope: {
            resourceId: DEVICE,
            allowBackground: true,
          },
        }]
      : [],
    sensorAuthorization:
      value.sensorId === null
        ? null
        : {
            sensorId: value.sensorId,
            privacyState: 'active',
            runtimeAvailability: 'available',
            permission: 'granted',
            deviceTrust: 'trusted',
            usage: 'passive_observation',
            explicitUserRequest: false,
          },
  };
}
function criticalRisk(
  cfg,
  nowMs,
) {
  const unresponsive = evidence(
    'eme_1111111111111111',
    {
      kind: 'responsiveness',
      finding: 'unresponsive',
      sensorId: null,
      confidence: 0.95,
    },
  );
  const fall = evidence(
    'eme_2222222222222222',
  );
  const heart = evidence(
    'eme_3333333333333333',
    {
      kind: 'heart_rate',
      finding: 'heart_rate_alert',
      sensorId:
        'sens_3333333333333333',
      confidence: 0.9,
    },
  );

  return riskModule.assessEmergencyRisk(
    {
      accountId: ACCOUNT,
      emergencySessionId:
        'ems_0123456789abcdef',
      config: cfg,
      candidates: [
        candidate(unresponsive),
        candidate(fall),
        candidate(heart),
      ],
    },
    nowMs,
  );
}
function registeredSession(
  cfg,
) {
  const registry =
    new sessionRegistryModule
      .EmergencySessionRegistry();

  const opened = registry.open(
    {
      emergencySessionId:
        'ems_0123456789abcdef',
      accountId: ACCOUNT,
      sourceDeviceId: DEVICE,
      config: cfg,
    },
    NOW,
  );

  assert.equal(opened.accepted, true);
  return opened.session;
}

function escalationChain(
  cfg,
) {
  const created =
    sessionStateModule
      .createEmergencyGuardianSessionState(
        registeredSession(cfg),
        NOW,
      );
  assert.equal(created.accepted, true);

  const checking =
    sessionStateModule
      .transitionEmergencyGuardianSessionState(
        {
          sessionState: created.state,
          event: 'request_check',
        },
        NOW,
      );
  assert.equal(checking.accepted, true);

  const started =
    responsivenessModule
      .startEmergencyResponsivenessCheck(
        {
          checkId:
            'emrc_0123456789abcdef',
          sessionState: checking.next,
          config: cfg,
        },
        NOW,
      );
  assert.equal(started.accepted, true);

  const evaluation =
    responsivenessModule
      .evaluateEmergencyResponsivenessCheck(
        {
          check: started.check,
          event: null,
        },
        NOW + 10_000,
      );
  assert.equal(
    evaluation.status,
    'timed_out',
  );

  const critical =
    sessionStateModule
      .transitionEmergencyGuardianSessionState(
        {
          sessionState: checking.next,
          event: 'risk_critical',
        },
        NOW + 10_001,
      );
  assert.equal(critical.accepted, true);

  const escalating =
    sessionStateModule
      .transitionEmergencyGuardianSessionState(
        {
          sessionState: critical.next,
          event: 'begin_escalation',
        },
        NOW + 10_002,
      );
  assert.equal(escalating.accepted, true);

  return {
    sessionState: escalating.next,
    check: started.check,
    evaluation,
  };
}

function planInput(
  cfg,
  overrides = {},
) {
  const chain =
    escalationChain(cfg);

  return {
    sessionState: chain.sessionState,
    config: cfg,
    riskAssessment:
      criticalRisk(
        cfg,
        NOW + 10_002,
      ),
    responsivenessCheck:
      chain.check,
    responsivenessEvaluation:
      chain.evaluation,
    ...overrides,
  };
}
test(
  'simulation escalation plan is structurally side-effect free',
  () => {
    const cfg = config();
    const result =
      planModule.planEmergencyEscalation(
        planInput(cfg),
        NOW + 10_002,
      );

    assert.equal(result.accepted, true);
    assert.equal(result.reason, 'planned');
    assert.equal(
      result.plan.simulationOnly,
      true,
    );
    assert.equal(
      result.plan.performsExternalAction,
      false,
    );
    assert.equal(
      result.plan.grantsAuthority,
      false,
    );
    assert.equal(
      result.plan.steps.every(
        (entry) =>
          entry.simulated
          && entry.requiredCapability
            === null,
      ),
      true,
    );
  },
);
test(
  'live plan names required contact authority but does not inherit it',
  () => {
    const cfg = config({
      mode: 'live',
    });
    const result =
      planModule.planEmergencyEscalation(
        planInput(cfg),
        NOW + 10_002,
      );

    assert.equal(result.accepted, true);
    assert.equal(
      result.plan.simulationOnly,
      false,
    );
    assert.equal(
      result.plan.steps[0].kind,
      'notify_contact',
    );
    assert.equal(
      result.plan.steps[0]
        .requiredCapability,
      'emergency.contact.notify',
    );
    assert.equal(
      result.plan.grantsAuthority,
      false,
    );
    assert.equal(
      result.plan.performsExternalAction,
      false,
    );
  },
);
test(
  'automatic escalation disabled produces confirmation-only plan',
  () => {
    const cfg = config({
      automaticEscalation: false,
    });
    const result =
      planModule.planEmergencyEscalation(
        planInput(cfg),
        NOW + 10_002,
      );

    assert.equal(result.accepted, true);
    assert.equal(
      result.reason,
      'confirmation_required',
    );
    assert.equal(
      result.plan.requiresUserConfirmation,
      true,
    );
    assert.deepEqual(
      result.plan.steps.map(
        (entry) => entry.kind,
      ),
      ['request_user_confirmation'],
    );
  },
);

test(
  'copied risk assessment cannot authorize planning',
  () => {
    const cfg = config();
    const input = planInput(cfg);

    const result =
      planModule.planEmergencyEscalation(
        {
          ...input,
          riskAssessment: {
            ...input.riskAssessment,
          },
        },
        NOW + 10_002,
      );
    assert.equal(result.accepted, false);
    assert.equal(
      result.reason,
      'invalid_input',
    );
  },
);

test(
  'responsive user cannot enter automatic escalation plan',
  () => {
    const cfg = config();
    const input = planInput(cfg);

    const forgedResponsive = {
      ...input.responsivenessEvaluation,
      status: 'responsive',
      reason: 'responsive',
    };

    const result =
      planModule.planEmergencyEscalation(
        {
          ...input,
          responsivenessEvaluation:
            forgedResponsive,
        },
        NOW + 10_002,
      );

    assert.equal(result.accepted, false);
    assert.equal(
      result.reason,
      'invalid_input',
    );
  },
);

test(
  'plan provenance rejects copied plans',
  () => {
    const cfg = config();
    const result =
      planModule.planEmergencyEscalation(
        planInput(cfg),
        NOW + 10_002,
      );
    assert.equal(
      planModule.isEmergencyEscalationPlan(
        result.plan,
      ),
      true,
    );
    assert.equal(
      planModule.isEmergencyEscalationPlan({
        ...result.plan,
      }),
      false,
    );
  },
);

function route(overrides = {}) {
  return {
    routeId:
      'emroute_0123456789abcdef',
    emergencySessionId:
      'ems_0123456789abcdef',
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    jurisdictionCode: 'DE',
    platform: 'android',
    serviceKind: 'emergency_call',
    destinationRef:
      'emdest_0123456789abcdef',
    status: 'available',
    requiresUserConfirmation: true,
    unattendedSupported: false,
    declaredAtMs: NOW + 9_000,
    expiresAtMs: NOW + 30_000,
    ...overrides,
  };
}

const trustedRouteContext = Object.freeze({
  jurisdictionCode: 'DE',
  platform: 'android',
});

test(
  'live route resolves only when requested and bound to the exact plan',
  () => {
    const cfg = config({
      mode: 'live',
    });
    const planned =
      planModule.planEmergencyEscalation(
        planInput(cfg),
        NOW + 10_002,
      );

    const parsed =
      routeModule.parseEmergencyRouteDescriptor(
        route(),
      );

    assert.ok(parsed);
    const resolved =
      routeModule.resolveEmergencyRoute(
        {
          plan: planned.plan,
          route: parsed,
        },
        NOW + 10_002,
        trustedRouteContext,
      );

    assert.equal(resolved.accepted, true);
    assert.equal(resolved.reason, 'resolved');
    assert.equal(
      resolved.grantsAuthority,
      false,
    );
    assert.equal(
      resolved.performsExternalAction,
      false,
    );
  },
);

test(
  'simulation plan is structurally unable to resolve a real emergency route',
  () => {
    const cfg = config();
    const planned =
      planModule.planEmergencyEscalation(
        planInput(cfg),
        NOW + 10_002,
      );
    const parsed =
      routeModule.parseEmergencyRouteDescriptor(
        route(),
      );

    const resolved =
      routeModule.resolveEmergencyRoute(
        {
          plan: planned.plan,
          route: parsed,
        },
        NOW + 10_002,
        trustedRouteContext,
      );

    assert.equal(resolved.accepted, false);
    assert.equal(
      resolved.reason,
      'simulation_only',
    );
  },
);

test(
  'route fails closed for stale unavailable and binding mismatch descriptors',
  () => {
    const cfg = config({
      mode: 'live',
    });
    const planned =
      planModule.planEmergencyEscalation(
        planInput(cfg),
        NOW + 10_002,
      );

    const cases = [
      [
        route({
          status: 'unavailable',
        }),
        'route_unavailable',
      ],
      [
        route({
          expiresAtMs:
            NOW + 10_002,
        }),
        'route_stale',
      ],
      [
        route({
          sourceDeviceId:
            'dev_fedcba9876543210',
        }),
        'binding_mismatch',
      ],
    ];

    for (const [descriptor, reason] of cases) {
      const parsed =
        routeModule.parseEmergencyRouteDescriptor(
          descriptor,
        );

      assert.ok(parsed);
      assert.equal(
        routeModule.resolveEmergencyRoute(
          {
            plan: planned.plan,
            route: parsed,
          },
          NOW + 10_002,
          trustedRouteContext,
        ).reason,
        reason,
      );
    }
  },
);

test(
  'route parser rejects raw destination and hidden authority fields',
  () => {
    for (const invalid of [
      {
        ...route(),
        destinationRef: '112',
      },
      {
        ...route(),
        phoneNumber: '112',
      },
      {
        ...route(),
        grantsAuthority: true,
      },
    ]) {
      assert.equal(
        routeModule
          .parseEmergencyRouteDescriptor(
            invalid,
          ),
        null,
      );
    }
  },
);

test(
  'route resolution rejects jurisdiction and platform mismatch',
  () => {
    const cfg = config({ mode: 'live' });
    const planned = planModule.planEmergencyEscalation(
      planInput(cfg),
      NOW + 10_002,
    );
    for (const context of [
      { jurisdictionCode: 'US', platform: 'android' },
      { jurisdictionCode: 'DE', platform: 'ios' },
    ]) {
      const parsed = routeModule.parseEmergencyRouteDescriptor(route());
      assert.ok(parsed);
      const resolved = routeModule.resolveEmergencyRoute(
        { plan: planned.plan, route: parsed },
        NOW + 10_002,
        context,
      );
      assert.equal(resolved.accepted, false);
      assert.equal(resolved.reason, 'binding_mismatch');
    }
  },
);

function acceptedEscalationConfirmation(
  sessionState,
  kind = 'confirm_escalation',
) {
  const registry =
    new eventRegistryModule
      .EmergencyEventRegistry();

  const accepted = registry.apply(
    {
      sessionState,
      sourceDeviceTrustInput: trust(),
      event: {
        emergencySessionId:
          'ems_0123456789abcdef',
        eventId:
          'emev_8888888888888888',
        sequence: 0,
        accountId: ACCOUNT,
        sourceDeviceId: DEVICE,
        generation:
          sessionState.state.generation,
        kind,
      },
    },
    NOW + 10_003,
  );
  assert.equal(accepted.accepted, true);
  return accepted.event;
}

test(
  'manual escalation confirmation converts a confirmation-only plan into execution steps',
  () => {
    const cfg = config({
      mode: 'live',
      automaticEscalation: false,
    });
    const input = planInput(cfg);
    const planned =
      planModule.planEmergencyEscalation(
        input,
        NOW + 10_002,
      );

    assert.equal(
      planned.reason,
      'confirmation_required',
    );
    assert.deepEqual(
      planned.plan.steps.map(
        (entry) => entry.kind,
      ),
      ['request_user_confirmation'],
    );
    const event =
      acceptedEscalationConfirmation(
        input.sessionState,
      );
    const confirmed =
      planModule.confirmEmergencyEscalationPlan(
        {
          plan: planned.plan,
          sessionState:
            input.sessionState,
          config: cfg,
          event,
        },
        NOW + 10_003,
      );

    assert.equal(confirmed.accepted, true);
    assert.equal(
      confirmed.reason,
      'confirmed',
    );
    assert.equal(
      confirmed.plan
        .requiresUserConfirmation,
      false,
    );
    assert.equal(
      confirmed.plan.actionNotBeforeMs,
      NOW + 10_003,
    );
    assert.deepEqual(
      confirmed.plan.steps.map(
        (entry) => entry.kind,
      ),
      [
        'notify_contact',
        'notify_contact',
        'resolve_emergency_route',
      ],
    );
    assert.equal(
      confirmed.plan.grantsAuthority,
      false,
    );
    assert.equal(
      confirmed.plan.performsExternalAction,
      false,
    );
  },
);

test(
  'ordinary responsiveness events cannot confirm manual escalation',
  () => {
    const cfg = config({
      mode: 'live',
      automaticEscalation: false,
    });
    const input = planInput(cfg);
    const planned =
      planModule.planEmergencyEscalation(
        input,
        NOW + 10_002,
      );
    const event =
      acceptedEscalationConfirmation(
        input.sessionState,
        'user_ok',
      );
    const confirmed =
      planModule.confirmEmergencyEscalationPlan(
        {
          plan: planned.plan,
          sessionState:
            input.sessionState,
          config: cfg,
          event,
        },
        NOW + 10_003,
      );

    assert.equal(confirmed.accepted, false);
    assert.equal(
      confirmed.reason,
      'wrong_confirmation',
    );
  },
);

test(
  'one escalation confirmation cannot be rebound to another source plan',
  () => {
    const cfg = config({
      mode: 'live',
      automaticEscalation: false,
    });
    const input = planInput(cfg);
    const first =
      planModule.planEmergencyEscalation(
        input,
        NOW + 10_002,
      );
    const second =
      planModule.planEmergencyEscalation(
        input,
        NOW + 10_002,
      );
    const event =
      acceptedEscalationConfirmation(
        input.sessionState,
      );

    const firstConfirmed =
      planModule.confirmEmergencyEscalationPlan(
        {
          plan: first.plan,
          sessionState:
            input.sessionState,
          config: cfg,
          event,
        },
        NOW + 10_003,
      );
    assert.equal(
      firstConfirmed.accepted,
      true,
    );
    const replay =
      planModule.confirmEmergencyEscalationPlan(
        {
          plan: second.plan,
          sessionState:
            input.sessionState,
          config: cfg,
          event,
        },
        NOW + 10_003,
      );

    assert.equal(replay.accepted, false);
    assert.equal(
      replay.reason,
      'confirmation_replay',
    );

    const duplicate =
      planModule.confirmEmergencyEscalationPlan(
        {
          plan: first.plan,
          sessionState:
            input.sessionState,
          config: cfg,
          event,
        },
        NOW + 10_003,
      );
    assert.equal(duplicate.accepted, true);
    assert.equal(
      duplicate.reason,
      'duplicate',
    );
    assert.equal(
      duplicate.plan,
      firstConfirmed.plan,
    );
  },
);
