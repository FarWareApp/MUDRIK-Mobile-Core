import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const packetModule = loadTypeScriptModule(
  'src/core/emergency/emergencyPacket.ts',
);
const planModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEscalationPlan.ts',
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
    NOW + 10_002,
  );
}

function registeredSession(cfg) {
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

function plan(cfg) {
  const created =
    sessionStateModule
      .createEmergencyGuardianSessionState(
        registeredSession(cfg),
        NOW,
      );

  const checking =
    sessionStateModule
      .transitionEmergencyGuardianSessionState(
        {
          sessionState: created.state,
          event: 'request_check',
        },
        NOW,
      );

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

  const evaluation =
    responsivenessModule
      .evaluateEmergencyResponsivenessCheck(
        {
          check: started.check,
          event: null,
        },

        NOW + 10_000,
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

  const escalating =
    sessionStateModule
      .transitionEmergencyGuardianSessionState(
        {
          sessionState: critical.next,
          event: 'begin_escalation',
        },
        NOW + 10_002,
      );

  const risk = criticalRisk(cfg);
  const planned =
    planModule.planEmergencyEscalation(
      {
        sessionState: escalating.next,
        config: cfg,
        riskAssessment: risk,

        responsivenessCheck:
          started.check,
        responsivenessEvaluation:
          evaluation,
      },
      NOW + 10_002,
    );

  assert.equal(planned.accepted, true);

  return {
    plan: planned.plan,
    risk,
  };
}

function packetInput(
  cfg,
  overrides = {},
) {
  const built = plan(cfg);

  return {
    packetId:
      'empkt_0123456789abcdef',
    plan: built.plan,
    config: cfg,
    riskAssessment: built.risk,
    locationRef: null,
    ...overrides,
  };
}

test(
  'packet contains only bounded high-level emergency references',
  () => {
    const cfg = config();
    const result =
      packetModule.buildEmergencyPacket(
        packetInput(cfg),
        NOW + 10_002,
      );

    assert.equal(result.accepted, true);
    assert.equal(result.reason, 'built');
    assert.equal(
      result.packet.category,
      'possible_critical_emergency',
    );
    assert.equal(
      result.packet.diagnosticClaim,
      false,
    );
    assert.equal(
      result.packet.minimumNecessary,
      true,
    );
    assert.equal(
      result.packet.grantsAuthority,
      false,
    );

    assert.equal(
      result.packet.performsExternalAction,
      false,
    );
    assert.equal(
      'rawVitals' in result.packet,
      false,
    );
    assert.equal(
      'chatHistory' in result.packet,
      false,
    );
    assert.equal(
      'credential' in result.packet,
      false,
    );
  },
);

test(
  'location and medical references are excluded when sharing is disabled',
  () => {
    const cfg = config({
      medicalProfileRef:
        'emp_0123456789abcdef',
    });
    const result =
      packetModule.buildEmergencyPacket(
        packetInput(
          cfg,

          {
            locationRef:
              'emloc_0123456789abcdef',
          },
        ),
        NOW + 10_002,
      );

    assert.equal(
      result.packet.locationRef,
      null,
    );
    assert.equal(
      result.packet.medicalProfileRef,
      null,
    );
  },
);

test(
  'explicit sharing includes only opaque location and medical references',
  () => {
    const cfg = config({
      shareLocation: true,
      medicalProfileRef:
        'emp_0123456789abcdef',
      shareMedicalProfile: true,
    });

    const result =
      packetModule.buildEmergencyPacket(
        packetInput(
          cfg,
          {
            locationRef:
              'emloc_0123456789abcdef',
          },
        ),
        NOW + 10_002,
      );

    assert.equal(
      result.packet.locationRef,
      'emloc_0123456789abcdef',
    );
    assert.equal(
      result.packet.medicalProfileRef,
      'emp_0123456789abcdef',
    );
  },
);

test(
  'packet rejects over-disclosure and hidden authority injection',
  () => {
    const cfg = config();

    for (const hostile of [

      {
        ...packetInput(cfg),
        chatHistory: ['secret'],
      },
      {
        ...packetInput(cfg),
        rawVitals: { heartRate: 180 },
      },
      {
        ...packetInput(cfg),
        credentials: 'token',
      },
      {
        ...packetInput(cfg),
        forceCall: true,
      },
    ]) {
      const result =
        packetModule.buildEmergencyPacket(
          hostile,
          NOW + 10_002,
        );

      assert.equal(result.accepted, false);
      assert.equal(
        result.reason,
        'invalid_input',
      );
    }
  },
);

test(
  'packet rejects copied plan and copied risk provenance',
  () => {
    const cfg = config();
    const input = packetInput(cfg);

    assert.equal(
      packetModule.buildEmergencyPacket(
        {
          ...input,
          plan: { ...input.plan },
        },
        NOW + 10_002,
      ).reason,
      'invalid_input',
    );

    assert.equal(
      packetModule.buildEmergencyPacket(
        {
          ...input,
          riskAssessment: {
            ...input.riskAssessment,
          },
        },
        NOW + 10_002,
      ).reason,
      'invalid_input',
    );
  },
);

test(
  'emergency packet provenance rejects copied packets',
  () => {
    const cfg = config();
    const result =
      packetModule.buildEmergencyPacket(
        packetInput(cfg),
        NOW + 10_002,
      );

    assert.equal(
      packetModule.isEmergencyPacket(
        result.packet,
      ),
      true,
    );
    assert.equal(
      packetModule.isEmergencyPacket({
        ...result.packet,
      }),
      false,
    );
  },
);
