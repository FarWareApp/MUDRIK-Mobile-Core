import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  IntelligencePerformanceLedger,
  parseIntelligencePerformanceObservation,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligencePerformance.ts',
);

const {
  buildAdaptiveIntelligenceRoutePlan,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceAdaptiveRouting.ts',
);

const NOW = 4_500_000_000;
const PROVIDER_A = 'provider_1111111111111111';
const PROVIDER_B = 'provider_2222222222222222';
const MODEL_A = 'model_1111111111111111';
const MODEL_B = 'model_2222222222222222';

function observation(
  index,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    sampleId:
      'intelligence_sample_'
      + String(index).repeat(16),
    providerRef: PROVIDER_A,
    modelRef: MODEL_A,
    service: 'general',
    succeeded: true,
    qualityScore: 900,
    firstResultMs: 200,
    costMicrosPer1kUnits: 700,
    observedAtMs: NOW - 100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function provider(
  providerRef,
  modelRef,
  qualityScore,
  overrides = {},
) {
  const suffix =
    providerRef === PROVIDER_A
      ? '1111111111111111'
      : '2222222222222222';

  return {
    protocolVersion: '1.0',
    providerRef,
    modelRef,
    service: 'general',
    executionMode: 'online',
    supportsStreaming: true,
    languageTags: ['en', 'de', 'ar'],
    qualityScore,
    expectedFirstResultMs: 300,
    expectedCostMicrosPer1kUnits: 800,
    maxInputBytes: 1024 * 1024,
    credentialRef:
      'credential_ref_' + suffix,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function health(
  providerRef,
  modelRef,
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    providerRef,
    modelRef,
    status: 'ready',
    observedAtMs: NOW - 100,
    measuredFirstResultMs: 250,
    failureRatePermille: 10,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    protocolVersion: '1.0',
    requestId:
      'intelligence_request_1111111111111111',
    accountId: 'acct_1111111111111111',
    policyId:
      'intelligence_policy_1111111111111111',
    policyRevision: 1,
    workspaceId:
      'workspace_1111111111111111',
    service: 'general',
    languageHints: ['en'],
    requireStreaming: false,
    inputBytes: 4096,
    networkAvailable: true,
    allowOnline: true,
    optimization: 'quality',
    maxLatencyMs: null,
    maxCostMicrosPer1kUnits: null,
    minQualityScore: 0,
    maxFallbacks: 3,
    maxHealthAgeMs: 60_000,
    requestedAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

const adaptivePolicy = {
  minimumSamples: 3,
  maximumProfileAgeMs: 60_000,
  observedWeightPermille: 700,
  degradedFailureRatePermille: 250,
  unavailableFailureRatePermille: 750,
};

test('performance ledger learns bounded EWMA metrics and rejects replay', () => {
  const ledger =
    new IntelligencePerformanceLedger({
      ewmaAlphaPermille: 500,
      maximumSamples: 100,
      maximumObservationAgeMs: 60_000,
    });

  assert.ok(
    parseIntelligencePerformanceObservation(
      observation(1),
    ),
  );

  assert.equal(
    ledger.record(
      observation(1),
      NOW,
    ),
    true,
  );

  assert.equal(
    ledger.record(
      observation(1),
      NOW,
    ),
    false,
  );

  assert.equal(
    ledger.record(
      observation(2, {
        succeeded: false,
        qualityScore: null,
        firstResultMs: null,
        costMicrosPer1kUnits: null,
      }),
      NOW,
    ),
    true,
  );

  const profile =
    ledger.getProfile(
      PROVIDER_A,
      MODEL_A,
      'general',
    );

  assert.ok(profile);
  assert.equal(profile.sampleCount, 2);
  assert.equal(
    profile.failureRatePermille,
    500,
  );
  assert.equal(
    profile.successRatePermille,
    500,
  );
  assert.equal(profile.qualityScore, 900);
});

test('performance observations cannot claim quality on failed requests', () => {
  assert.equal(
    parseIntelligencePerformanceObservation(
      observation(1, {
        succeeded: false,
        qualityScore: 900,
      }),
    ),
    null,
  );
});

test('adaptive routing can demote historically unreliable provider', () => {
  const providers = [
    provider(
      PROVIDER_A,
      MODEL_A,
      950,
    ),
    provider(
      PROVIDER_B,
      MODEL_B,
      850,
    ),
  ];

  const healthValues = [
    health(PROVIDER_A, MODEL_A),
    health(PROVIDER_B, MODEL_B),
  ];

  const profiles = [
    {
      providerRef: PROVIDER_A,
      modelRef: MODEL_A,
      service: 'general',
      sampleCount: 20,
      successRatePermille: 50,
      failureRatePermille: 950,
      qualityScore: 600,
      firstResultMs: 900,
      costMicrosPer1kUnits: 1000,
      lastObservedAtMs: NOW - 100,
    },
  ];

  const result =
    buildAdaptiveIntelligenceRoutePlan({
      request: request(),
      providers,
      health: healthValues,
      performanceProfiles: profiles,
      policy: adaptivePolicy,
    });

  assert.equal(
    result.route.accepted,
    true,
  );
  assert.equal(
    result.route.value?.primary?.providerRef,
    PROVIDER_B,
  );
  assert.deepEqual(
    result.adjustedProviderKeys,
    [
      PROVIDER_A
        + ':'
        + MODEL_A
        + ':general',
    ],
  );
});

test('insufficient or stale performance history cannot override live routing', () => {
  const providers = [
    provider(
      PROVIDER_A,
      MODEL_A,
      950,
    ),
    provider(
      PROVIDER_B,
      MODEL_B,
      850,
    ),
  ];

  const base = {
    providerRef: PROVIDER_A,
    modelRef: MODEL_A,
    service: 'general',
    sampleCount: 2,
    successRatePermille: 0,
    failureRatePermille: 1000,
    qualityScore: 100,
    firstResultMs: 2000,
    costMicrosPer1kUnits: 2000,
    lastObservedAtMs: NOW - 100,
  };

  const insufficient =
    buildAdaptiveIntelligenceRoutePlan({
      request: request(),
      providers,
      health: [
        health(PROVIDER_A, MODEL_A),
        health(PROVIDER_B, MODEL_B),
      ],
      performanceProfiles: [base],
      policy: adaptivePolicy,
    });

  assert.equal(
    insufficient.route.value?.primary?.providerRef,
    PROVIDER_A,
  );
  assert.deepEqual(
    insufficient.adjustedProviderKeys,
    [],
  );

  const stale =
    buildAdaptiveIntelligenceRoutePlan({
      request: request(),
      providers,
      health: [
        health(PROVIDER_A, MODEL_A),
        health(PROVIDER_B, MODEL_B),
      ],
      performanceProfiles: [
        {
          ...base,
          sampleCount: 100,
          lastObservedAtMs:
            NOW
            - adaptivePolicy.maximumProfileAgeMs
            - 1,
        },
      ],
      policy: adaptivePolicy,
    });

  assert.equal(
    stale.route.value?.primary?.providerRef,
    PROVIDER_A,
  );
});

test('adaptive history never promotes externally unavailable provider', () => {
  const result =
    buildAdaptiveIntelligenceRoutePlan({
      request: request(),
      providers: [
        provider(
          PROVIDER_A,
          MODEL_A,
          950,
        ),
        provider(
          PROVIDER_B,
          MODEL_B,
          850,
        ),
      ],
      health: [
        health(
          PROVIDER_A,
          MODEL_A,
          { status: 'unavailable' },
        ),
        health(PROVIDER_B, MODEL_B),
      ],
      performanceProfiles: [
        {
          providerRef: PROVIDER_A,
          modelRef: MODEL_A,
          service: 'general',
          sampleCount: 100,
          successRatePermille: 1000,
          failureRatePermille: 0,
          qualityScore: 1000,
          firstResultMs: 10,
          costMicrosPer1kUnits: 1,
          lastObservedAtMs: NOW - 1,
        },
      ],
      policy: adaptivePolicy,
    });

  assert.equal(
    result.route.value?.primary?.providerRef,
    PROVIDER_B,
  );
});

test('out-of-order history is rejected so old telemetry cannot rewrite current profile', () => {
  const ledger =
    new IntelligencePerformanceLedger({
      ewmaAlphaPermille: 500,
      maximumSamples: 100,
      maximumObservationAgeMs: 60_000,
    });

  assert.equal(
    ledger.record(
      observation(1, {
        observedAtMs: NOW - 100,
      }),
      NOW,
    ),
    true,
  );

  assert.equal(
    ledger.record(
      observation(2, {
        observedAtMs: NOW - 200,
      }),
      NOW,
    ),
    false,
  );

  assert.equal(
    ledger.getProfile(
      PROVIDER_A,
      MODEL_A,
      'general',
    )?.sampleCount,
    1,
  );
});

test('malformed learned profile is ignored rather than poisoning routing', () => {
  const result =
    buildAdaptiveIntelligenceRoutePlan({
      request: request(),
      providers: [
        provider(
          PROVIDER_A,
          MODEL_A,
          950,
        ),
        provider(
          PROVIDER_B,
          MODEL_B,
          850,
        ),
      ],
      health: [
        health(PROVIDER_A, MODEL_A),
        health(PROVIDER_B, MODEL_B),
      ],
      performanceProfiles: [
        {
          providerRef: PROVIDER_A,
          modelRef: MODEL_A,
          service: 'general',
          sampleCount: 50,
          successRatePermille: 1000,
          failureRatePermille: 1000,
          qualityScore: 0,
          firstResultMs: 1000,
          costMicrosPer1kUnits: 1000,
          lastObservedAtMs: NOW - 1,
        },
      ],
      policy: adaptivePolicy,
    });

  assert.deepEqual(
    result.adjustedProviderKeys,
    [],
  );
  assert.equal(
    result.route.value?.primary?.providerRef,
    PROVIDER_A,
  );
});
