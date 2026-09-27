import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const actionModule = loadTypeScriptModule(
  'src/core/emergency/emergencyActionPolicy.ts',
);
const approvalModule = loadTypeScriptModule(
  'src/core/emergency/emergencyCallApproval.ts',
);
const eventRegistryModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEventRegistry.ts',
);
const packetModule = loadTypeScriptModule(
  'src/core/emergency/emergencyPacket.ts',
);
const planModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEscalationPlan.ts',
);
const riskModule = loadTypeScriptModule(
  'src/core/emergency/emergencyRiskAssessment.ts',
);
const routeModule = loadTypeScriptModule(
  'src/core/emergency/emergencyRoute.ts',
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
const PLAN_TIME = NOW + 10_002;
const ROUTE_TIME = PLAN_TIME;
const CONFIRM_TIME = PLAN_TIME + 1;
const ACTION_TIME = PLAN_TIME + 15_001;

const ACCOUNT = 'acct_0123456789abcdef';
const DEVICE = 'dev_0123456789abcdef';
const KEY = 'dkey_0123456789abcdef';
const THUMB = 'A'.repeat(43);
const SESSION = 'ems_0123456789abcdef';
const CONTACT = 'emc_0123456789abcdef';

function config(overrides = {}) {
  return {
    configId: 'egc_0123456789abcdef',
    accountId: ACCOUNT,
    revision: 0,
    enabled: true,
    mode: 'live',
    automaticEscalation: true,
    responsivenessTimeoutMs: 10_000,
    escalationCountdownMs: 15_000,
    evidenceSources: [
      'responsiveness',
      'motion',
      'heart_rate',
    ],
    emergencyContactRefs: [CONTACT],
    shareLocation: false,
    medicalProfileRef: null,
    shareMedicalProfile: false,
    updatedAtMs: 90_000,
    ...overrides,
  };
}

function trust(overrides = {}) {
  return {
    device: {      deviceId: DEVICE,
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
    ...overrides,
  };
}

function evidence(id, overrides = {}) {
  return {
    emergencySessionId: SESSION,
    evidenceId: id,
    sequence: 0,
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    kind: 'motion',
    finding: 'fall_detected',
    observedAtMs: NOW + 9_000,
    confidence: 0.9,
    sensorId: 'sens_0123456789abcdef',
    ...overrides,
  };
}const CAPABILITY = {
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
          grantId: 'grant-' + value.evidenceId,
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
            runtimeAvailability: 'available',            permission: 'granted',
            deviceTrust: 'trusted',
            usage: 'passive_observation',
            explicitUserRequest: false,
          },
  };
}

function criticalRisk(cfg) {
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
      sensorId: 'sens_3333333333333333',
      confidence: 0.9,
    },
  );

  return riskModule.assessEmergencyRisk(
    {
      accountId: ACCOUNT,
      emergencySessionId: SESSION,
      config: cfg,
      candidates: [
        candidate(unresponsive),
        candidate(fall),
        candidate(heart),
      ],
    },
    PLAN_TIME,
  );
}

function registeredSession(cfg) {
  const registry =
    new sessionRegistryModule
      .EmergencySessionRegistry();

  const opened = registry.open(
    {
      emergencySessionId: SESSION,
      accountId: ACCOUNT,
      sourceDeviceId: DEVICE,
      config: cfg,
    },
    NOW,
  );

  assert.equal(opened.accepted, true);
  return opened.session;
}

function buildEscalatingState(cfg) {
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
          checkId: 'emrc_0123456789abcdef',
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
  assert.equal(evaluation.status, 'timed_out');

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
        PLAN_TIME,
      );
  assert.equal(escalating.accepted, true);

  return {
    sessionState: escalating.next,
    check: started.check,
    evaluation,
  };
}

function buildFixture(
  configOverrides = {},
  routeOverrides = {},
) {
  const cfg = config(configOverrides);
  const chain = buildEscalatingState(cfg);
  const risk = criticalRisk(cfg);

  const planned =
    planModule.planEmergencyEscalation(
      {
        sessionState: chain.sessionState,
        config: cfg,
        riskAssessment: risk,
        responsivenessCheck: chain.check,
        responsivenessEvaluation:
          chain.evaluation,
      },
      PLAN_TIME,
    );
  assert.equal(planned.accepted, true);

  const packet =
    packetModule.buildEmergencyPacket(
      {
        packetId: 'empkt_0123456789abcdef',
        plan: planned.plan,
        config: cfg,
        riskAssessment: risk,
        locationRef: null,
        capabilityGrants: [],
      },
      PLAN_TIME,
    );
  assert.equal(packet.accepted, true);

  const route =
    routeModule.parseEmergencyRouteDescriptor({
      routeId: 'emroute_0123456789abcdef',
      emergencySessionId: SESSION,
      accountId: ACCOUNT,
      sourceDeviceId: DEVICE,
      jurisdictionCode: 'DE',
      platform: 'android',
      serviceKind: 'emergency_call',
      destinationRef:
        'emdest_0123456789abcdef',
      status: 'available',
      requiresUserConfirmation: true,
      unattendedSupported: false,      declaredAtMs: ROUTE_TIME,
      expiresAtMs: PLAN_TIME + 60_000,
      ...routeOverrides,
    });
  assert.ok(route);

  return {
    cfg,
    sessionState: chain.sessionState,
    plan: planned.plan,
    packet: packet.packet,
    route,
  };
}

function contactAction(overrides = {}) {
  return {
    actionId: 'emact_1111111111111111',
    kind: 'notify_contact',
    targetRef: CONTACT,
    ...overrides,
  };
}

function callAction(overrides = {}) {
  return {
    actionId: 'emact_2222222222222222',
    kind: 'initiate_emergency_call',
    targetRef: 'emroute_0123456789abcdef',
    ...overrides,
  };
}
function grant(
  capability,
  resourceId,
  overrides = {},
) {
  return {
    grantId:
      'grant_' + capability.replaceAll('.', '_'),
    subjectId: DEVICE,
    capability,
    scope: {
      resourceId,
    },
    ...overrides,
  };
}

function acceptedConfirmation(
  fixture,
  overrides = {},
) {
  const registry =
    new eventRegistryModule
      .EmergencyEventRegistry();
  const accepted = registry.apply(
    {
      sessionState: fixture.sessionState,
      sourceDeviceTrustInput: trust(),
      event: {
        emergencySessionId: SESSION,
        eventId: 'emev_9999999999999999',
        sequence: 0,
        accountId: ACCOUNT,
        sourceDeviceId: DEVICE,
        generation:
          fixture.sessionState.state.generation,
        kind: 'confirm_emergency_call',
        ...overrides,
      },
    },
    CONFIRM_TIME,
  );

  assert.equal(accepted.accepted, true);
  return accepted.event;
}

function callApproval(
  fixture,
  action = callAction(),
) {
  const approved =
    approvalModule.approveEmergencyCall(
      {
        plan: fixture.plan,
        route: fixture.route,
        action,
        event:
          acceptedConfirmation(fixture),
      },
      CONFIRM_TIME,
    );

  assert.equal(approved.accepted, true);
  return approved.approval;
}

const ROUTE_CONTEXT = {
  jurisdictionCode: 'DE',
  platform: 'android',
};

test(
  'contact notification rechecks exact scoped capability at action time',
  () => {
    const fixture = buildFixture();
    const action = contactAction();
    const decision =
      actionModule.evaluateEmergencyAction(
        {
          accountId: ACCOUNT,
          plan: fixture.plan,
          packet: fixture.packet,
          sessionState: fixture.sessionState,
          action,
          route: null,
          approval: null,
          deviceTrustInput: trust(),
          capabilityGrants: [
            grant(
              'emergency.contact.notify',
              CONTACT,
            ),
          ],
        },
        ACTION_TIME,
        ROUTE_CONTEXT,
      );

    assert.equal(decision.authorized, true);
    assert.equal(decision.reason, 'authorized');
    assert.equal(
      decision.capability,
      'emergency.contact.notify',
    );
    assert.equal(decision.targetRef, CONTACT);
    assert.equal(
      decision.grantsAuthority,
      false,
    );
    assert.equal(
      decision.performsExternalAction,
      false,
    );
  },
);

test(
  'call requires trusted route approval and exact critical capability',
  () => {
    const fixture = buildFixture();
    const action = callAction();
    const approval =
      callApproval(fixture, action);

    const decision =
      actionModule.evaluateEmergencyAction(
        {
          accountId: ACCOUNT,
          plan: fixture.plan,
          packet: fixture.packet,
          sessionState: fixture.sessionState,
          action,
          route: fixture.route,
          approval,
          deviceTrustInput: trust(),
          capabilityGrants: [
            grant(
              'emergency.call.initiate',
              fixture.route.destinationRef,
            ),
          ],
        },
        ACTION_TIME,
        ROUTE_CONTEXT,
      );

    assert.equal(decision.authorized, true);
    assert.equal(decision.reason, 'authorized');
    assert.equal(
      decision.capability,
      'emergency.call.initiate',
    );
    assert.equal(
      decision.targetRef,
      fixture.route.destinationRef,
    );
  },
);
test(
  'raw boolean copied or missing approval cannot confirm a call',
  () => {
    const fixture = buildFixture();
    const action = callAction();
    const approval =
      callApproval(fixture, action);
    const callGrant = grant(
      'emergency.call.initiate',
      fixture.route.destinationRef,
    );

    for (const invalidApproval of [
      true,
      { ...approval },
      null,
    ]) {
      const decision =
        actionModule.evaluateEmergencyAction(
          {
            accountId: ACCOUNT,
            plan: fixture.plan,
            packet: fixture.packet,
            sessionState: fixture.sessionState,
            action,
            route: fixture.route,
            approval: invalidApproval,
            deviceTrustInput: trust(),
            capabilityGrants: [callGrant],
          },
          ACTION_TIME,
          ROUTE_CONTEXT,
        );

      assert.equal(
        decision.authorized,
        false,
      );
      assert.equal(
        [
          'invalid_input',
          'confirmation_required',
        ].includes(decision.reason),
        true,
      );
    }
  },
);

test(
  'simulation mode structurally blocks external emergency actions',
  () => {
    const fixture = buildFixture({
      mode: 'simulation',
    });
    const decision =
      actionModule.evaluateEmergencyAction(
        {
          accountId: ACCOUNT,
          plan: fixture.plan,
          packet: fixture.packet,
          sessionState: fixture.sessionState,
          action: contactAction(),
          route: null,
          approval: null,
          deviceTrustInput: trust(),
          capabilityGrants: [
            grant(
              'emergency.contact.notify',
              CONTACT,
            ),
          ],
        },
        ACTION_TIME,
        ROUTE_CONTEXT,
      );

    assert.equal(decision.authorized, false);
    assert.equal(
      decision.reason,
      'simulation_only',
    );
  },
);
test(
  'revoked device after planning blocks action authorization',
  () => {
    const fixture = buildFixture();
    const revokedTrust = trust({
      device: {
        ...trust().device,
        state: 'revoked',
      },
    });

    const decision =
      actionModule.evaluateEmergencyAction(
        {
          accountId: ACCOUNT,
          plan: fixture.plan,
          packet: fixture.packet,
          sessionState: fixture.sessionState,
          action: contactAction(),
          route: null,
          approval: null,
          deviceTrustInput: revokedTrust,
          capabilityGrants: [
            grant(
              'emergency.contact.notify',
              CONTACT,
            ),
          ],
        },
        ACTION_TIME,
        ROUTE_CONTEXT,
      );

    assert.equal(decision.authorized, false);
    assert.equal(
      decision.reason,
      'device_untrusted',
    );
  },
);

test(
  'wrong generic expired or revoked grants cannot substitute for call authority',
  () => {
    const fixture = buildFixture();
    const action = callAction();
    const approval =
      callApproval(fixture, action);
    const destination =
      fixture.route.destinationRef;

    const badGrants = [
      grant(
        'emergency.contact.notify',
        destination,
      ),
      grant(
        'device.control',
        destination,
      ),
      grant(
        'emergency.call.initiate',
        'emdest_1111111111111111',
      ),
      grant(
        'emergency.call.initiate',
        destination,
        {
          expiresAtMs: ACTION_TIME,
        },
      ),
      grant(
        'emergency.call.initiate',
        destination,
        {
          revokedAtMs: ACTION_TIME,
        },
      ),
    ];

    for (const badGrant of badGrants) {
      const decision =
        actionModule.evaluateEmergencyAction(
          {
            accountId: ACCOUNT,
            plan: fixture.plan,
            packet: fixture.packet,
            sessionState: fixture.sessionState,
            action,
            route: fixture.route,
            approval,
            deviceTrustInput: trust(),
            capabilityGrants: [badGrant],
          },
          ACTION_TIME,
          ROUTE_CONTEXT,
        );

      assert.equal(decision.authorized, false);
      assert.equal(
        decision.reason,
        'capability_denied',
      );
    }
  },
);

test(
  'jurisdiction or platform mismatch is rechecked at action time',
  () => {
    const fixture = buildFixture();
    const action = callAction();
    const approval =
      callApproval(fixture, action);
    const callGrant = grant(
      'emergency.call.initiate',
      fixture.route.destinationRef,
    );

    for (const context of [
      {
        jurisdictionCode: 'US',
        platform: 'android',
      },
      {
        jurisdictionCode: 'DE',
        platform: 'ios',
      },
    ]) {
      const decision =
        actionModule.evaluateEmergencyAction(
          {
            accountId: ACCOUNT,
            plan: fixture.plan,
            packet: fixture.packet,
            sessionState: fixture.sessionState,
            action,
            route: fixture.route,
            approval,
            deviceTrustInput: trust(),
            capabilityGrants: [callGrant],
          },
          ACTION_TIME,
          context,
        );

      assert.equal(decision.authorized, false);
      assert.equal(
        decision.reason,
        'route_denied',
      );
    }
  },
);

test(
  'one confirmation event cannot be rebound to another action',
  () => {
    const fixture = buildFixture();
    const event =
      acceptedConfirmation(fixture);
    const firstAction = callAction();

    const first =
      approvalModule.approveEmergencyCall(
        {
          plan: fixture.plan,
          route: fixture.route,
          action: firstAction,
          event,
        },
        CONFIRM_TIME,
      );
    assert.equal(first.accepted, true);

    const otherAction = callAction({
      actionId: 'emact_3333333333333333',
    });
    const replay =
      approvalModule.approveEmergencyCall(
        {
          plan: fixture.plan,
          route: fixture.route,
          action: otherAction,
          event,
        },
        CONFIRM_TIME,
      );

    assert.equal(replay.accepted, false);
    assert.equal(
      replay.reason,
      'confirmation_replay',
    );
  },
);

test(
  'call confirmation event cannot alter responsiveness outcome',
  () => {
    const fixture = buildFixture();
    const event =
      acceptedConfirmation(fixture);

    const evaluation =
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check: fixture.plan
              ? buildEscalatingState(fixture.cfg).check
              : null,
            event,
          },
          CONFIRM_TIME,
        );

    assert.equal(evaluation.accepted, false);
    assert.equal(
      evaluation.reason,
      'event_not_responsiveness',
    );
  },
);

test(
  'hidden fields and malformed action targets fail closed',
  () => {
    const fixture = buildFixture();
    const base = {
      accountId: ACCOUNT,
      plan: fixture.plan,
      packet: fixture.packet,
      sessionState: fixture.sessionState,
      action: contactAction(),
      route: null,
      approval: null,
      deviceTrustInput: trust(),
      capabilityGrants: [
        grant(
          'emergency.contact.notify',
          CONTACT,
        ),
      ],
    };
    for (const hostile of [
      {
        ...base,
        forceExecute: true,
      },
      {
        ...base,
        action: {
          ...contactAction(),
          targetRef: 'not-a-contact',
        },
      },
      {
        ...base,
        action: {
          ...contactAction(),
          grantsAuthority: true,
        },
      },
    ]) {
      const decision =
        actionModule.evaluateEmergencyAction(
          hostile,
          ACTION_TIME,
          ROUTE_CONTEXT,
        );

      assert.equal(decision.authorized, false);
      assert.equal(
        decision.reason,
        'invalid_input',
      );
    }
  },
);

test(
  'escalation countdown blocks side effects until trusted deadline',
  () => {
    const fixture = buildFixture();

    const decision =
      actionModule.evaluateEmergencyAction(
        {
          accountId: ACCOUNT,
          plan: fixture.plan,
          packet: fixture.packet,
          sessionState: fixture.sessionState,
          action: contactAction(),
          route: null,
          approval: null,
          deviceTrustInput: trust(),
          capabilityGrants: [
            grant(
              'emergency.contact.notify',
              CONTACT,
            ),
          ],
        },
        PLAN_TIME + 1,
        ROUTE_CONTEXT,
      );
    assert.equal(decision.authorized, false);
    assert.equal(
      decision.reason,
      'countdown_active',
    );
    assert.equal(
      fixture.plan.actionNotBeforeMs,
      PLAN_TIME
        + fixture.cfg.escalationCountdownMs,
    );
  },
);

test(
  'user cancellation invalidates the old escalating state and plan',
  () => {
    const fixture = buildFixture();

    const cancelled =
      sessionStateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: fixture.sessionState,
            event: 'user_cancel',
          },
          PLAN_TIME + 1,
        );

    assert.equal(cancelled.accepted, true);
    assert.equal(
      cancelled.next.state.phase,
      'check_user',
    );

    const decision =
      actionModule.evaluateEmergencyAction(
        {
          accountId: ACCOUNT,
          plan: fixture.plan,
          packet: fixture.packet,
          sessionState: fixture.sessionState,
          action: contactAction(),
          route: null,
          approval: null,
          deviceTrustInput: trust(),
          capabilityGrants: [
            grant(
              'emergency.contact.notify',
              CONTACT,
            ),
          ],
        },
        ACTION_TIME,
        ROUTE_CONTEXT,
      );

    assert.equal(decision.authorized, false);
    assert.equal(
      decision.reason,
      'state_not_current',
    );
  },
);
