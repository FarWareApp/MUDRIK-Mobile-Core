import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseIntelligenceProviderRegistration,
  toPublicIntelligenceProvider,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceProvider.ts',
);
const {
  parseIntelligenceProviderHealth,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceHealth.ts',
);
const {
  parseIntelligenceRouteRequest,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceRequest.ts',
);
const {
  buildIntelligenceRoutePlan,
  parseIntelligenceRoutePlan,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceRouting.ts',
);
const {
  evaluateIntelligenceFailover,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceFailover.ts',
);
const {
  parseIntelligenceResultEnvelope,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceResult.ts',
);
const {
  parseIntelligenceAuditEvent,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceAudit.ts',
);
const {
  IntelligenceProviderRegistry,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceRegistry.ts',
);

const {
  parseIntelligenceRoutingPolicy,
  authorizeIntelligenceRouteRequest,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligencePolicy.ts',
);

const {
  parseIntelligenceAdapterInvocation,
  parseIntelligenceAdapterOutputEvent,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceAdapter.ts',
);

const {
  normalizeIntelligenceProviderFailure,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceFailure.ts',
);

const NOW = 2_000_000_000;
const ACCOUNT = 'acct_1111111111111111';
const WORKSPACE =
  'workspace_1111111111111111';
const REQUEST =
  'intelligence_request_1111111111111111';
const POLICY =
  'intelligence_policy_1111111111111111';

const PROVIDER_A =
  'provider_1111111111111111';
const PROVIDER_B =
  'provider_2222222222222222';
const PROVIDER_C =
  'provider_3333333333333333';
const MODEL_A =
  'model_1111111111111111';
const MODEL_B =
  'model_2222222222222222';
const MODEL_C =
  'model_3333333333333333';

function provider(overrides = {}) {
  return {
    protocolVersion: '1.0',
    providerRef: PROVIDER_A,
    modelRef: MODEL_A,
    service: 'general',
    executionMode: 'online',
    supportsStreaming: true,
    languageTags: ['en', 'de', 'ar'],
    qualityScore: 850,
    expectedFirstResultMs: 300,
    expectedCostMicrosPer1kUnits: 800,
    maxInputBytes: 1024 * 1024,
    credentialRef:
      'credential_ref_1111111111111111',
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function health(overrides = {}) {
  return {
    protocolVersion: '1.0',
    providerRef: PROVIDER_A,
    modelRef: MODEL_A,
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
    requestId: REQUEST,
    accountId: ACCOUNT,
    policyId: POLICY,
    policyRevision: 1,
    workspaceId: WORKSPACE,
    service: 'general',
    languageHints: ['en'],
    requireStreaming: false,
    inputBytes: 4096,
    networkAvailable: true,
    allowOnline: true,
    optimization: 'balanced',
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

function policy(overrides = {}) {
  return {
    protocolVersion: '1.0',
    policyId: POLICY,
    accountId: ACCOUNT,
    workspaceId: WORKSPACE,
    enabledServices: [
      'general',
      'coding',
      'vision',
      'stt',
      'tts',
    ],
    onlineAllowedServices: [
      'general',
      'coding',
      'vision',
      'stt',
      'tts',
    ],
    allowedOptimizations: [
      'balanced',
      'quality',
      'latency',
      'cost',
      'offline',
    ],
    maxFallbacks: 7,
    maxHealthAgeMs: 60_000,
    maxLatencyMs: null,
    maxCostMicrosPer1kUnits: null,
    minQualityScore: 0,
    revision: 1,
    updatedAtMs: NOW - 1_000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function candidateSet() {
  return {
    providers: [
      provider(),
      provider({
        providerRef: PROVIDER_B,
        modelRef: MODEL_B,
        qualityScore: 920,
        expectedFirstResultMs: 600,
        expectedCostMicrosPer1kUnits: 1200,
        credentialRef:
          'credential_ref_2222222222222222',
      }),
      provider({
        providerRef: PROVIDER_C,
        modelRef: MODEL_C,
        executionMode: 'offline',
        qualityScore: 700,
        expectedFirstResultMs: 80,
        expectedCostMicrosPer1kUnits: 0,
        credentialRef: null,
      }),
    ],
    health: [
      health(),
      health({
        providerRef: PROVIDER_B,
        modelRef: MODEL_B,
        measuredFirstResultMs: 500,
        failureRatePermille: 30,
      }),
      health({
        providerRef: PROVIDER_C,
        modelRef: MODEL_C,
        measuredFirstResultMs: 70,
        failureRatePermille: 5,
      }),
    ],
  };
}

function routedRegistry(
  service = 'general',
  requestId = REQUEST,
) {
  const registry =
    new IntelligenceProviderRegistry();

  assert.equal(
    registry.setPolicy(
      policy(),
     NOW).accepted,
    true,
  );

  const providers = [
    provider({ service }),
    provider({
      providerRef: PROVIDER_B,
      modelRef: MODEL_B,
      service,
      qualityScore: 930,
      credentialRef:
        'credential_ref_2222222222222222',
    }),
  ];

  const healthValues = [
    health(),
    health({
      providerRef: PROVIDER_B,
      modelRef: MODEL_B,
      failureRatePermille: 5,
    }),
  ];

  for (const item of providers) {
    assert.equal(
      registry.register(item).accepted,
      true,
    );
  }
  for (const item of healthValues) {
    assert.equal(
      registry.updateHealth(item, NOW).accepted,
      true,
    );
  }

  const routed = registry.route(
    request({
      requestId,
      service,
      optimization: 'quality',
    }),
   NOW);

  assert.equal(routed.reason, 'routed');
  assert.ok(routed.value?.primary);
  assert.ok(routed.value.fallbacks.length > 0);

  return { registry, routed };
}

test(
  'provider registration is strict and public projection strips credential reference',
  () => {
    const parsed =
      parseIntelligenceProviderRegistration(
        provider(),
      );

    assert.ok(parsed);
    assert.equal(
      parsed.credentialRef,
      'credential_ref_1111111111111111',
    );

    const publicValue =
      toPublicIntelligenceProvider(parsed);

    assert.equal(
      Object.hasOwn(
        publicValue,
        'credentialRef',
      ),
      false,
    );

    assert.equal(
      parseIntelligenceProviderRegistration({
        ...provider(),
        hiddenField: 'not-allowed',
      }),
      null,
    );

    assert.equal(
      parseIntelligenceProviderRegistration(
        provider({
          executionMode: 'offline',
          credentialRef:
            'credential_ref_1111111111111111',
        }),
      ),
      null,
    );

    assert.equal(
      parseIntelligenceProviderRegistration(
        provider({
          credentialRef: 'raw-key-value',
        }),
      ),
      null,
    );
  },
);

test(
  'health and route request contracts reject hidden authority and malformed bounds',
  () => {
    assert.ok(
      parseIntelligenceProviderHealth(
        health(),
      ),
    );
    assert.ok(
      parseIntelligenceRouteRequest(
        request(),
      ),
    );

    assert.equal(
      parseIntelligenceProviderHealth({
        ...health(),
        grantsExecutionAuthority: true,
      }),
      null,
    );
    assert.equal(
      parseIntelligenceRouteRequest({
        ...request(),
        maxFallbacks: 8,
      }),
      null,
    );
    assert.equal(
      parseIntelligenceRouteRequest({
        ...request(),
        credentialRef:
          'credential_ref_1111111111111111',
      }),
      null,
    );
  },
);

test(
  'routing policy binds account workspace revision service and online scope',
  () => {
    const parsedPolicy =
      parseIntelligenceRoutingPolicy(
        policy(),
      );
    const parsedRequest =
      parseIntelligenceRouteRequest(
        request(),
      );

    assert.ok(parsedPolicy);
    assert.ok(parsedRequest);
    assert.equal(
      authorizeIntelligenceRouteRequest(
        parsedPolicy,
        parsedRequest,
      ).accepted,
      true,
    );

    const noOnline =
      parseIntelligenceRoutingPolicy(
        policy({
          onlineAllowedServices: [
            'coding',
          ],
        }),
      );

    assert.ok(noOnline);
    assert.equal(
      authorizeIntelligenceRouteRequest(
        noOnline,
        parsedRequest,
      ).reason,
      'online_denied',
    );

    const wrongRevision =
      parseIntelligenceRouteRequest(
        request({
          policyRevision: 2,
        }),
      );

    assert.ok(wrongRevision);
    assert.equal(
      authorizeIntelligenceRouteRequest(
        parsedPolicy,
        wrongRevision,
      ).reason,
      'binding_mismatch',
    );
  },
);

test(
  'quality latency cost offline and balanced routing remain deterministic',
  () => {
    const set = candidateSet();

    const expected = {
      quality: PROVIDER_B,
      latency: PROVIDER_C,
      cost: PROVIDER_C,
      offline: PROVIDER_C,
      balanced: PROVIDER_C,
    };

    for (
      const [optimization, providerRef]
      of Object.entries(expected)
    ) {
      const routed =
        buildIntelligenceRoutePlan({
          request:
            request({ optimization }),
          providers: set.providers,
          health: set.health,
        });

      assert.equal(
        routed.accepted,
        true,
        routed.reason,
      );
      assert.equal(
        routed.reason,
        'routed',
      );
      assert.ok(routed.value);
      assert.equal(
        routed.value.primary.providerRef,
        providerRef,
      );
      assert.equal(
        routed.value.fallbacks.length,
        2,
      );
      assert.equal(
        Object.hasOwn(
          routed.value.primary,
          'credentialRef',
        ),
        false,
      );
      assert.ok(
        parseIntelligenceRoutePlan(
          routed.value,
        ),
      );
    }
  },
);

test(
  'network and online policy remove online providers before ranking',
  () => {
    const set = candidateSet();

    const offlineOnly =
      buildIntelligenceRoutePlan({
        request:
          request({
            networkAvailable: false,
          }),
        providers: set.providers,
        health: set.health,
      });

    assert.equal(
      offlineOnly.reason,
      'routed',
    );
    assert.equal(
      offlineOnly.value.primary.providerRef,
      PROVIDER_C,
    );
    assert.equal(
      offlineOnly.value.fallbacks.length,
      0,
    );

    const onlineDenied =
      buildIntelligenceRoutePlan({
        request:
          request({
            allowOnline: false,
          }),
        providers: set.providers,
        health: set.health,
      });

    assert.equal(
      onlineDenied.value.primary.providerRef,
      PROVIDER_C,
    );

    const noOffline =
      buildIntelligenceRoutePlan({
        request:
          request({
            allowOnline: false,
            minQualityScore: 800,
          }),
        providers: set.providers,
        health: set.health,
      });

    assert.equal(
      noOffline.reason,
      'no_eligible_provider',
    );
    assert.equal(
      noOffline.value.primary,
      null,
    );
  },
);

test(
  'stale unavailable and constraint-violating providers cannot enter route plan',
  () => {
    const set = candidateSet();

    const routed =
      buildIntelligenceRoutePlan({
        request:
          request({
            maxLatencyMs: 300,
            maxCostMicrosPer1kUnits: 900,
            minQualityScore: 800,
          }),
        providers: set.providers,
        health: [
          health(),
          health({
            providerRef: PROVIDER_B,
            modelRef: MODEL_B,
            status: 'unavailable',
          }),
          health({
            providerRef: PROVIDER_C,
            modelRef: MODEL_C,
            observedAtMs:
              NOW - 100_000,
          }),
        ],
      });

    assert.equal(
      routed.reason,
      'routed',
    );
    assert.equal(
      routed.value.primary.providerRef,
      PROVIDER_A,
    );
    assert.equal(
      routed.value.fallbacks.length,
      0,
    );
  },
);

test(
  'registry keeps credentials private and rejects stale health policy gaps and request replay conflicts',
  () => {
    const registry =
      new IntelligenceProviderRegistry();

    assert.equal(
      registry.route(
        request(),
       NOW).reason,
      'policy_denied',
    );

    assert.equal(
      registry.setPolicy(
        policy(),
       NOW).accepted,
      true,
    );

    const set = candidateSet();

    for (const item of set.providers) {
      assert.equal(
        registry.register(item).accepted,
        true,
      );
    }
    for (const item of set.health) {
      assert.equal(
        registry.updateHealth(item, NOW).accepted,
        true,
      );
    }

    assert.equal(
      registry.updateHealth(
        health({
          observedAtMs: NOW - 200,
        }),
       NOW).reason,
      'health_stale',
    );

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 3,
          updatedAtMs: NOW,
        }),
       NOW).reason,
      'policy_revision_gap',
    );

    const publicProviders =
      registry.listPublicProviders();

    assert.equal(
      publicProviders.every(
        (item) =>
          !Object.hasOwn(
            item,
            'credentialRef',
          ),
      ),
      true,
    );

    const routed =
      registry.route(
        request({
          optimization: 'quality',
        }),
       NOW);

    assert.equal(
      routed.reason,
      'routed',
    );
    assert.ok(routed.value);

    const binding =
      registry.resolveAdapterBinding(
        routed.value,
        routed.value.primary.providerRef,
        routed.value.primary.modelRef,
      );

    assert.ok(binding);
    assert.equal(
      binding.credentialRef,
      'credential_ref_2222222222222222',
    );

    assert.equal(
      registry.resolveAdapterBinding(
        JSON.parse(
          JSON.stringify(routed.value),
        ),
        routed.value.primary.providerRef,
        routed.value.primary.modelRef,
      ),
      null,
    );

    assert.equal(
      registry.route(
        request({
          optimization: 'quality',
        }),
       NOW).value,
      routed.value,
    );

    assert.equal(
      registry.route(
        request({
          optimization: 'latency',
        }),
       NOW).reason,
      'request_replay_conflict',
    );
  },
);

function issuedRegistry(
  requestOverrides = {},
) {
  const registry =
    new IntelligenceProviderRegistry();

  assert.equal(
    registry.setPolicy(
      policy(),
     NOW).accepted,
    true,
  );

  const set = candidateSet();

  for (const item of set.providers) {
    assert.equal(
      registry.register(item).accepted,
      true,
    );
  }
  for (const item of set.health) {
    assert.equal(
      registry.updateHealth(item, NOW).accepted,
      true,
    );
  }

  const routed =
    registry.route(
      request({
        optimization: 'quality',
        ...requestOverrides,
      }),
     NOW);

  assert.equal(
    routed.reason,
    'routed',
  );
  assert.ok(routed.value);

  return {
    registry,
    plan: routed.value,
  };
}

test(
  'policy revision invalidates an already issued plan',
  () => {
    const {
      registry,
      plan,
    } = issuedRegistry();

    assert.equal(
      registry.isIssuedPlan(plan),
      true,
    );

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 2,
          updatedAtMs: NOW + 100,
          onlineAllowedServices: [
            'coding',
            'vision',
            'stt',
            'tts',
          ],
        }),
       NOW + 100).accepted,
      true,
    );

    assert.equal(
      registry.isIssuedPlan(plan),
      false,
    );
    assert.equal(
      registry.resolveAdapterBinding(
        plan,
        plan.primary.providerRef,
        plan.primary.modelRef,
      ),
      null,
    );
  },
);

test(
  'provider outage blocks adapter credential resolution for an issued plan',
  () => {
    const {
      registry,
      plan,
    } = issuedRegistry();

    const primary =
      plan.primary;

    assert.ok(
      registry.resolveAdapterBinding(
        plan,
        primary.providerRef,
        primary.modelRef,
      ),
    );

    const currentHealth =
      health({
        providerRef:
          primary.providerRef,
        modelRef:
          primary.modelRef,
        status: 'unavailable',
        observedAtMs: NOW + 100,
      });

    assert.equal(
      registry.updateHealth(
        currentHealth,
       NOW + 100).accepted,
      true,
    );

    assert.equal(
      registry.resolveAdapterBinding(
        plan,
        primary.providerRef,
        primary.modelRef,
      ),
      null,
    );
  },
);

test(
  'failover is confined to admitted candidates and forbids silent output mixing',
  () => {
    const {
      registry,
      plan,
    } = issuedRegistry();

    const current =
      plan.primary;
    const next =
      plan.fallbacks[0];

    const base = {
      plan,
      currentProviderRef:
        current.providerRef,
      currentModelRef:
        current.modelRef,
      nextProviderRef:
        next.providerRef,
      nextModelRef:
        next.modelRef,
      failureCode: 'timeout',
      retryable: true,
      bufferedInputReplayAvailable: true,
    };

    const beforeOutput =
      registry.evaluateIssuedFailover({
        ...base,
        attemptPhase: 'selected',
        explicitRestart: false,
        generationWillRotate: false,
      });

    assert.equal(
      beforeOutput.allowed,
      true,
    );
    assert.equal(
      beforeOutput.reason,
      'allowed_before_output',
    );

    const mixed =
      registry.evaluateIssuedFailover({
        ...base,
        attemptPhase:
          'output_observed',
        explicitRestart: true,
        generationWillRotate: false,
      });

    assert.equal(
      mixed.allowed,
      false,
    );
    assert.equal(
      mixed.reason,
      'output_mixing_forbidden',
    );

    const restarted =
      registry.evaluateIssuedFailover({
        ...base,
        attemptPhase:
          'output_observed',
        explicitRestart: true,
        generationWillRotate: true,
      });

    assert.equal(
      restarted.allowed,
      true,
    );
    assert.equal(
      restarted.requiresGenerationRotation,
      true,
    );

    const outsidePlan =
      evaluateIntelligenceFailover({
        ...base,
        nextProviderRef:
          'provider_9999999999999999',
        nextModelRef:
          'model_9999999999999999',
        attemptPhase: 'selected',
        explicitRestart: false,
        generationWillRotate: false,
      });

    assert.equal(
      outsidePlan.reason,
      'candidate_not_in_plan',
    );

    const nonRetryable =
      evaluateIntelligenceFailover({
        ...base,
        failureCode:
          'permission_denied',
        retryable: true,
        attemptPhase: 'selected',
        explicitRestart: false,
        generationWillRotate: false,
      });

    assert.equal(
      nonRetryable.reason,
      'failure_not_retryable',
    );
  },
);

test(
  'attempt tracker enforces identity sequence idempotency and final closure',
  () => {
    const {
      registry,
      plan,
    } = issuedRegistry();

    const tracker =
      registry.createAttemptTracker(
        plan,
        plan.primary.providerRef,
        plan.primary.modelRef,
        3,
      );

    assert.ok(tracker);

    const event0 = {
      protocolVersion: '1.0',
      requestId: plan.requestId,
      planId: plan.planId,
      providerRef:
        plan.primary.providerRef,
      modelRef:
        plan.primary.modelRef,
      service: plan.service,
      generation: 3,
      sequence: 0,
      resultRef:
        'result_chunk_0000000000000001',
      isFinal: false,
      observedAtMs: NOW + 10,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.ok(
      parseIntelligenceAdapterOutputEvent(
        event0,
      ),
    );

    assert.equal(
      tracker.acceptOutput(
        event0,
      ).reason,
      'accepted',
    );
    assert.equal(
      tracker.acceptOutput(
        event0,
      ).reason,
      'idempotent',
    );

    assert.equal(
      tracker.acceptOutput({
        ...event0,
        sequence: 2,
        resultRef:
          'result_chunk_0000000000000003',
      }).reason,
      'sequence_gap',
    );

    const final = {
      ...event0,
      sequence: 1,
      resultRef:
        'result_chunk_0000000000000002',
      isFinal: true,
      observedAtMs: NOW + 20,
    };

    assert.equal(
      tracker.acceptOutput(
        final,
      ).reason,
      'accepted',
    );
    assert.equal(
      tracker.getState().phase,
      'completed',
    );

    assert.equal(
      tracker.acceptOutput({
        ...final,
        sequence: 2,
        resultRef:
          'result_chunk_0000000000000003',
      }).reason,
      'lifecycle_closed',
    );
  },
);

test(
  'result and audit envelopes remain content-free and non-authoritative',
  () => {
    const {
      registry,
      plan,
    } = issuedRegistry();

    const envelope = {
      protocolVersion: '1.0',
      requestId: plan.requestId,
      planId: plan.planId,
      providerRef:
        plan.primary.providerRef,
      modelRef:
        plan.primary.modelRef,
      service: plan.service,
      generation: 1,
      resultRef:
        'result_ref_1111111111111111',
      completedAtMs: NOW + 100,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    const parsed =
      parseIntelligenceResultEnvelope(
        envelope,
      );

    assert.ok(parsed);
    assert.ok(
      registry.validateIssuedResult(
        plan,
        envelope,
      ),
    );

    assert.equal(
      parseIntelligenceResultEnvelope({
        ...envelope,
        grantsCapabilityAuthority: true,
      }),
      null,
    );

    const audit = {
      protocolVersion: '1.0',
      eventId:
        'intelligence_event_1111111111111111',
      kind: 'route_planned',
      requestId: plan.requestId,
      planId: plan.planId,
      providerRef:
        plan.primary.providerRef,
      modelRef:
        plan.primary.modelRef,
      reasonCode: 'routed',
      occurredAtMs: NOW + 100,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.ok(
      parseIntelligenceAuditEvent(
        audit,
      ),
    );

    assert.equal(
      parseIntelligenceAuditEvent({
        ...audit,
        prompt:
          'private prompt content',
      }),
      null,
    );
  },
);

test(
  'provider failure normalization strips unsafe messages and forces terminal codes non-retryable',
  () => {
    const normalized =
      normalizeIntelligenceProviderFailure({
        code: 'permission_denied',
        retryable: true,
        providerSafeMessage:
          'permission rejected',
      });

    assert.equal(
      normalized.retryable,
      false,
    );

    const unsafe =
      normalizeIntelligenceProviderFailure({
        code: 'timeout',
        retryable: true,
        providerSafeMessage:
          'password=value1234',
      });

    assert.equal(
      unsafe.providerSafeMessage,
      null,
    );
  },
);


test(
  'routing policy may deny all online services and request scope cannot widen policy limits',
  () => {
    const parsedPolicy =
      parseIntelligenceRoutingPolicy(
        policy({
          onlineAllowedServices: [],
          maxFallbacks: 1,
          maxHealthAgeMs: 20_000,
          maxLatencyMs: 500,
          maxCostMicrosPer1kUnits: 1000,
          minQualityScore: 700,
        }),
      );

    assert.ok(parsedPolicy);

    const scopedRequest =
      (overrides = {}) =>
        request({
          allowOnline: false,
          maxFallbacks: 1,
          maxHealthAgeMs: 20_000,
          maxLatencyMs: 500,
          maxCostMicrosPer1kUnits: 1000,
          minQualityScore: 700,
          ...overrides,
        });

    const cases = [
      [
        scopedRequest({ allowOnline: true }),
        'online_denied',
      ],
      [
        scopedRequest({
          maxFallbacks: 2,
        }),
        'fallback_scope_denied',
      ],
      [
        scopedRequest({
          maxHealthAgeMs: 30_000,
        }),
        'health_scope_denied',
      ],
      [
        scopedRequest({
          maxLatencyMs: null,
        }),
        'latency_scope_denied',
      ],
      [
        scopedRequest({
          maxCostMicrosPer1kUnits: null,
        }),
        'cost_scope_denied',
      ],
      [
        scopedRequest({
          minQualityScore: 600,
        }),
        'quality_scope_denied',
      ],
    ];

    for (const [input, reason] of cases) {
      const parsedRequest =
        parseIntelligenceRouteRequest(input);
      assert.ok(parsedRequest);
      assert.equal(
        authorizeIntelligenceRouteRequest(
          parsedPolicy,
          parsedRequest,
        ).reason,
        reason,
      );
    }
  },
);

test(
  'policy revision invalidates previously issued plans and adapter bindings',
  () => {
    const { registry, routed } =
      routedRegistry();
    const plan = routed.value;

    assert.equal(
      registry.isIssuedPlan(plan),
      true,
    );

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 2,
          updatedAtMs: NOW + 1,
        }),
       NOW + 1).accepted,
      true,
    );

    assert.equal(
      registry.isIssuedPlan(plan),
      false,
    );
    assert.equal(
      registry.resolveAdapterBinding(
        plan,
        plan.primary.providerRef,
        plan.primary.modelRef,
      ),
      null,
    );
    assert.equal(
      registry.createAttemptTracker(
        plan,
        plan.primary.providerRef,
        plan.primary.modelRef,
        1,
      ),
      null,
    );

    assert.equal(
      registry.route(request(), NOW).reason,
      'policy_denied',
    );
  },
);

test(
  'all five service classes route through the same provider-independent boundary',
  () => {
    for (const service of [
      'general',
      'coding',
      'vision',
      'stt',
      'tts',
    ]) {
      const routed =
        buildIntelligenceRoutePlan({
          request: request({
            service,
            languageHints: [],
          }),
          providers: [
            provider({ service }),
          ],
          health: [health()],
        });

      assert.equal(
        routed.reason,
        'routed',
      );
      assert.equal(
        routed.value.primary.service,
        service,
      );
      assert.equal(
        routed.value.providerIndependent,
        true,
      );
    }
  },
);

test(
  'future health duplicate provider identity and copied plan metadata fail closed',
  () => {
    const future =
      buildIntelligenceRoutePlan({
        request: request(),
        providers: [provider()],
        health: [
          health({
            observedAtMs: NOW + 1,
          }),
        ],
      });

    assert.equal(
      future.reason,
      'no_eligible_provider',
    );

    assert.equal(
      buildIntelligenceRoutePlan({
        request: request(),
        providers: [
          provider(),
          provider(),
        ],
        health: [health()],
      }).reason,
      'invalid_input',
    );

    const routed =
      buildIntelligenceRoutePlan({
        request: request(),
        providers: [provider()],
        health: [health()],
      });

    assert.ok(routed.value);

    assert.equal(
      parseIntelligenceRoutePlan({
        ...routed.value,
        policyRevision: 2,
      })?.policyRevision,
      2,
    );

    assert.equal(
      parseIntelligenceRoutePlan({
        ...routed.value,
        credentialRef:
          'credential_ref_1111111111111111',
      }),
      null,
    );
  },
);


test(
  'issued failover is restricted to admitted providers and blocks output mixing',
  () => {
    const { registry, routed } =
      routedRegistry();
    const plan = routed.value;
    const current = plan.primary;
    const next = plan.fallbacks[0];

    const base = {
      plan,
      currentProviderRef:
        current.providerRef,
      currentModelRef:
        current.modelRef,
      nextProviderRef:
        next.providerRef,
      nextModelRef:
        next.modelRef,
      failureCode: 'timeout',
      retryable: true,
      bufferedInputReplayAvailable: true,
    };

    assert.equal(
      registry.evaluateIssuedFailover({
        ...base,
        attemptPhase: 'selected',
        explicitRestart: false,
        generationWillRotate: false,
      }).reason,
      'allowed_before_output',
    );

    assert.equal(
      registry.evaluateIssuedFailover({
        ...base,
        attemptPhase: 'output_observed',
        explicitRestart: false,
        generationWillRotate: false,
      }).reason,
      'explicit_restart_required',
    );

    assert.equal(
      registry.evaluateIssuedFailover({
        ...base,
        attemptPhase: 'output_observed',
        explicitRestart: true,
        generationWillRotate: false,
      }).reason,
      'output_mixing_forbidden',
    );

    const rotated =
      registry.evaluateIssuedFailover({
        ...base,
        attemptPhase: 'output_observed',
        explicitRestart: true,
        generationWillRotate: true,
      });

    assert.equal(rotated.allowed, true);
    assert.equal(
      rotated.requiresGenerationRotation,
      true,
    );

    assert.equal(
      registry.evaluateIssuedFailover({
        ...base,
        plan:
          JSON.parse(
            JSON.stringify(plan),
          ),
        attemptPhase: 'selected',
        explicitRestart: false,
        generationWillRotate: false,
      }).reason,
      'plan_not_issued',
    );

    assert.equal(
      evaluateIntelligenceFailover({
        ...base,
        nextProviderRef: PROVIDER_C,
        nextModelRef: MODEL_C,
        attemptPhase: 'selected',
        explicitRestart: false,
        generationWillRotate: false,
      }).reason,
      'candidate_not_in_plan',
    );
  },
);

test(
  'STT failover after capture requires replayable buffered input',
  () => {
    const { registry, routed } =
      routedRegistry(
        'stt',
        'intelligence_request_2222222222222222',
      );
    const plan = routed.value;
    const current = plan.primary;
    const next = plan.fallbacks[0];

    const decision =
      registry.evaluateIssuedFailover({
        plan,
        currentProviderRef:
          current.providerRef,
        currentModelRef:
          current.modelRef,
        nextProviderRef:
          next.providerRef,
        nextModelRef:
          next.modelRef,
        attemptPhase: 'started',
        failureCode: 'timeout',
        retryable: true,
        explicitRestart: false,
        generationWillRotate: false,
        bufferedInputReplayAvailable: false,
      });

    assert.equal(
      decision.reason,
      'input_replay_required',
    );
  },
);

test(
  'provider failure normalization removes secret messages and forces policy failures non-retryable',
  () => {
    const safe =
      normalizeIntelligenceProviderFailure({
        code: 'timeout',
        retryable: true,
        providerSafeMessage:
          'temporary timeout',
      });

    assert.equal(safe.retryable, true);
    assert.equal(
      safe.providerSafeMessage,
      'temporary timeout',
    );

    const secret =
      normalizeIntelligenceProviderFailure({
        code: 'provider_unavailable',
        retryable: true,
        providerSafeMessage:
          'api_key=secret-value-1234',
      });

    assert.equal(
      secret.providerSafeMessage,
      null,
    );

    assert.equal(
      normalizeIntelligenceProviderFailure({
        code: 'permission_denied',
        retryable: true,
        providerSafeMessage: null,
      }).retryable,
      false,
    );
  },
);

test(
  'adapter invocation and output events are credential-free and non-authoritative',
  () => {
    const invocation = {
      protocolVersion: '1.0',
      requestId: REQUEST,
      planId:
        'intelligence_plan_1111111111111111',
      providerRef: PROVIDER_A,
      modelRef: MODEL_A,
      service: 'general',
      generation: 1,
      inputRef:
        'input:1111111111111111',
      streaming: true,
      deadlineAtMs: NOW + 10_000,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.ok(
      parseIntelligenceAdapterInvocation(
        invocation,
      ),
    );
    assert.equal(
      parseIntelligenceAdapterInvocation({
        ...invocation,
        credentialRef:
          'credential_ref_1111111111111111',
      }),
      null,
    );

    const output = {
      protocolVersion: '1.0',
      requestId: REQUEST,
      planId:
        'intelligence_plan_1111111111111111',
      providerRef: PROVIDER_A,
      modelRef: MODEL_A,
      service: 'general',
      generation: 1,
      sequence: 0,
      resultRef:
        'result:1111111111111111',
      isFinal: false,
      observedAtMs: NOW,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.ok(
      parseIntelligenceAdapterOutputEvent(
        output,
      ),
    );
    assert.equal(
      parseIntelligenceAdapterOutputEvent({
        ...output,
        grantsExecutionAuthority: true,
      }),
      null,
    );
  },
);

test(
  'policy supports a true offline-only workspace',
  () => {
    const offlinePolicy =
      parseIntelligenceRoutingPolicy(
        policy({
          onlineAllowedServices: [],
        }),
      );

    assert.ok(offlinePolicy);

    const onlineRequest =
      parseIntelligenceRouteRequest(
        request({
          allowOnline: true,
        }),
      );
    const offlineRequest =
      parseIntelligenceRouteRequest(
        request({
          allowOnline: false,
        }),
      );

    assert.ok(onlineRequest);
    assert.ok(offlineRequest);

    assert.equal(
      authorizeIntelligenceRouteRequest(
        offlinePolicy,
        onlineRequest,
      ).reason,
      'online_denied',
    );
    assert.equal(
      authorizeIntelligenceRouteRequest(
        offlinePolicy,
        offlineRequest,
      ).accepted,
      true,
    );
  },
);

test(
  'stt failover after capture requires replayable buffered input',
  () => {
    const providers = [
      provider({
        providerRef: PROVIDER_A,
        modelRef: MODEL_A,
        service: 'stt',
      }),
      provider({
        providerRef: PROVIDER_B,
        modelRef: MODEL_B,
        service: 'stt',
        credentialRef:
          'credential_ref_2222222222222222',
      }),
    ];
    const healthState = [
      health(),
      health({
        providerRef: PROVIDER_B,
        modelRef: MODEL_B,
      }),
    ];

    const routed =
      buildIntelligenceRoutePlan({
        request:
          request({
            service: 'stt',
            optimization: 'quality',
          }),
        providers,
        health: healthState,
      });

    assert.equal(
      routed.reason,
      'routed',
    );
    assert.ok(
      routed.value.fallbacks.length > 0,
    );

    const current =
      routed.value.primary;
    const next =
      routed.value.fallbacks[0];

    const blocked =
      evaluateIntelligenceFailover({
        plan: routed.value,
        currentProviderRef:
          current.providerRef,
        currentModelRef:
          current.modelRef,
        nextProviderRef:
          next.providerRef,
        nextModelRef:
          next.modelRef,
        attemptPhase: 'started',
        failureCode: 'timeout',
        retryable: true,
        explicitRestart: false,
        generationWillRotate: false,
        bufferedInputReplayAvailable: false,
      });

    assert.equal(
      blocked.reason,
      'input_replay_required',
    );

    const allowed =
      evaluateIntelligenceFailover({
        plan: routed.value,
        currentProviderRef:
          current.providerRef,
        currentModelRef:
          current.modelRef,
        nextProviderRef:
          next.providerRef,
        nextModelRef:
          next.modelRef,
        attemptPhase: 'started',
        failureCode: 'timeout',
        retryable: true,
        explicitRestart: false,
        generationWillRotate: false,
        bufferedInputReplayAvailable: true,
      });

    assert.equal(
      allowed.allowed,
      true,
    );
  },
);

test(
  'route plan parser rejects identity rank and service tampering',
  () => {
    const set = candidateSet();
    const routed =
      buildIntelligenceRoutePlan({
        request:
          request({
            optimization: 'quality',
          }),
        providers: set.providers,
        health: set.health,
      });

    assert.ok(routed.value);

    assert.equal(
      parseIntelligenceRoutePlan({
        ...routed.value,
        planId:
          'intelligence_plan_9999999999999999',
      }),
      null,
    );

    assert.equal(
      parseIntelligenceRoutePlan({
        ...routed.value,
        primary: {
          ...routed.value.primary,
          rank: 2,
        },
      }),
      null,
    );

    assert.equal(
      parseIntelligenceRoutePlan({
        ...routed.value,
        primary: {
          ...routed.value.primary,
          service: 'coding',
        },
      }),
      null,
    );
  },
);


test(
  'registry trusted time rejects future policy health and request timestamps',
  () => {
    const registry =
      new IntelligenceProviderRegistry();

    assert.equal(
      registry.setPolicy(
        policy({
          updatedAtMs: NOW + 1,
        }),
        NOW,
      ).reason,
      'policy_invalid',
    );

    assert.equal(
      registry.setPolicy(
        policy(),
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      registry.register(
        provider(),
      ).accepted,
      true,
    );

    assert.equal(
      registry.updateHealth(
        health({
          observedAtMs: NOW + 1,
        }),
        NOW,
      ).reason,
      'health_invalid',
    );

    assert.equal(
      registry.updateHealth(
        health(),
        NOW,
      ).accepted,
      true,
    );

    assert.equal(
      registry.route(
        request({
          requestedAtMs: NOW + 1,
        }),
        NOW,
      ).reason,
      'invalid_input',
    );
  },
);

test(
  'policy revision invalidates an already running attempt before later output is accepted',
  () => {
    const { registry, routed } =
      routedRegistry(
        'general',
        'intelligence_request_3333333333333333',
      );
    const plan = routed.value;
    const primary = plan.primary;

    const tracker =
      registry.createAttemptTracker(
        plan,
        primary.providerRef,
        primary.modelRef,
        9,
      );

    assert.ok(tracker);

    const output = {
      protocolVersion: '1.0',
      requestId: plan.requestId,
      planId: plan.planId,
      providerRef:
        primary.providerRef,
      modelRef:
        primary.modelRef,
      service: plan.service,
      generation: 9,
      sequence: 0,
      resultRef:
        'result:9999999999999999',
      isFinal: false,
      observedAtMs: NOW,
      grantsExecutionAuthority: false,
      grantsSensorAuthority: false,
      grantsApprovalAuthority: false,
      grantsCapabilityAuthority: false,
    };

    assert.equal(
      registry.setPolicy(
        policy({
          revision: 2,
          updatedAtMs: NOW + 1,
        }),
        NOW + 1,
      ).accepted,
      true,
    );

    assert.equal(
      tracker.acceptOutput(
        output,
      ).reason,
      'plan_invalidated',
    );

    const next =
      plan.fallbacks[0];

    assert.equal(
      registry.evaluateIssuedFailover({
        plan,
        currentProviderRef:
          primary.providerRef,
        currentModelRef:
          primary.modelRef,
        nextProviderRef:
          next.providerRef,
        nextModelRef:
          next.modelRef,
        attemptPhase: 'selected',
        failureCode: 'timeout',
        retryable: true,
        explicitRestart: false,
        generationWillRotate: false,
        bufferedInputReplayAvailable: true,
      }).reason,
      'plan_not_issued',
    );
  },
);
