import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  IntelligenceProviderRegistry,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceRegistry.ts',
);

const {
  IntelligenceExecutionCoordinator,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceExecutionCoordinator.ts',
);

const NOW = 3_000_000_000;
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
const MODEL_A =
  'model_1111111111111111';
const MODEL_B =
  'model_2222222222222222';

function policy() {
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
    updatedAtMs: NOW - 1000,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function provider(
  providerRef,
  modelRef,
  qualityScore,
) {
  return {
    protocolVersion: '1.0',
    providerRef,
    modelRef,
    service: 'general',
    executionMode: 'online',
    supportsStreaming: true,
    languageTags: ['en', 'ar', 'de'],
    qualityScore,
    expectedFirstResultMs: 100,
    expectedCostMicrosPer1kUnits: 100,
    maxInputBytes: 1024 * 1024,
    credentialRef:
      'credential_ref_' + (
        providerRef === PROVIDER_A
          ? '1111111111111111'
          : '2222222222222222'
      ),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function health(
  providerRef,
  modelRef,
) {
  return {
    protocolVersion: '1.0',
    providerRef,
    modelRef,
    status: 'ready',
    observedAtMs: NOW - 10,
    measuredFirstResultMs: 100,
    failureRatePermille: 1,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function request() {
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
    inputBytes: 512,
    networkAvailable: true,
    allowOnline: true,
    optimization: 'quality',
    maxLatencyMs: null,
    maxCostMicrosPer1kUnits: null,
    minQualityScore: 0,
    maxFallbacks: 2,
    maxHealthAgeMs: 60_000,
    requestedAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function setupRegistry() {
  const registry =
    new IntelligenceProviderRegistry();

  assert.equal(
    registry.setPolicy(
      policy(),
      NOW,
    ).accepted,
    true,
  );

  for (const item of [
    provider(
      PROVIDER_A,
      MODEL_A,
      950,
    ),
    provider(
      PROVIDER_B,
      MODEL_B,
      900,
    ),
  ]) {
    assert.equal(
      registry.register(item).accepted,
      true,
    );
  }

  for (const item of [
    health(PROVIDER_A, MODEL_A),
    health(PROVIDER_B, MODEL_B),
  ]) {
    assert.equal(
      registry.updateHealth(
        item,
        NOW,
      ).accepted,
      true,
    );
  }

  const routed =
    registry.route(
      request(),
      NOW,
    );

  assert.equal(routed.accepted, true);
  assert.ok(routed.value?.primary);
  assert.equal(
    routed.value.primary.providerRef,
    PROVIDER_A,
  );
  assert.equal(
    routed.value.fallbacks[0]?.providerRef,
    PROVIDER_B,
  );

  return {
    registry,
    plan: routed.value,
  };
}

function executionInput(plan, overrides = {}) {
  return {
    plan,
    inputRef:
      'input_ref_1111111111111111',
    streaming: false,
    deadlineAtMs: NOW + 60_000,
    initialGeneration: 0,
    maxAttempts: 2,
    bufferedInputReplayAvailable: true,
    ...overrides,
  };
}

function successAdapter(
  providerRef,
  modelRef,
  options = {},
) {
  return {
    providerRef,
    modelRef,
    service: 'general',
    async invoke(
      invocation,
      onOutput,
      onFailure,
    ) {
      queueMicrotask(() => {
        if (options.fail) {
          onFailure(options.fail);
          return;
        }

        if (options.partialThenFail) {
          onOutput({
            protocolVersion: '1.0',
            requestId: invocation.requestId,
            planId: invocation.planId,
            providerRef,
            modelRef,
            service: invocation.service,
            generation:
              invocation.generation,
            sequence: 0,
            resultRef:
              'result_ref_partial_111111111111',
            isFinal: false,
            observedAtMs: NOW + 100,
            grantsExecutionAuthority: false,
            grantsSensorAuthority: false,
            grantsApprovalAuthority: false,
            grantsCapabilityAuthority: false,
          });

          onFailure({
            code: 'timeout',
            retryable: true,
            providerSafeMessage: null,
          });
          return;
        }

        onOutput({
          protocolVersion: '1.0',
          requestId: invocation.requestId,
          planId: invocation.planId,
          providerRef,
          modelRef,
          service: invocation.service,
          generation:
            invocation.generation,
          sequence: 0,
          resultRef:
            options.resultRef
            ?? 'result_ref_final_1111111111111',
          isFinal: true,
          observedAtMs: NOW + 100,
          grantsExecutionAuthority: false,
          grantsSensorAuthority: false,
          grantsApprovalAuthority: false,
          grantsCapabilityAuthority: false,
        });
      });

      return {
        async cancel() {},
      };
    },
  };
}

function resolver(adapters) {
  const map =
    new Map(
      adapters.map(
        (adapter) => [
          adapter.providerRef
            + ':'
            + adapter.modelRef,
          adapter,
        ],
      ),
    );

  return {
    resolve(binding) {
      return (
        map.get(
          binding.providerRef
          + ':'
          + binding.modelRef,
        )
        ?? null
      );
    },
  };
}

test('execution coordinator completes on the routed primary provider', async () => {
  const { registry, plan } =
    setupRegistry();

  const coordinator =
    new IntelligenceExecutionCoordinator(
      registry,
      resolver([
        successAdapter(
          PROVIDER_A,
          MODEL_A,
        ),
        successAdapter(
          PROVIDER_B,
          MODEL_B,
        ),
      ]),
      () => NOW,
    );

  const result =
    await coordinator
      .execute(
        executionInput(plan),
      )
      .result;

  assert.equal(result.status, 'succeeded');
  assert.equal(
    result.providerRef,
    PROVIDER_A,
  );
  assert.equal(result.attempts, 1);
  assert.equal(result.generation, 0);
  assert.equal(
    result.resultRef,
    'result_ref_final_1111111111111',
  );
  assert.equal(
    result.grantsExecutionAuthority,
    false,
  );
});

test('retryable provider failure fails over to the next issued candidate', async () => {
  const { registry, plan } =
    setupRegistry();

  const first =
    successAdapter(
      PROVIDER_A,
      MODEL_A,
      {
        fail: {
          code: 'provider_unavailable',
          retryable: true,
          providerSafeMessage: null,
        },
      },
    );

  const second =
    successAdapter(
      PROVIDER_B,
      MODEL_B,
      {
        resultRef:
          'result_ref_fallback_22222222222',
      },
    );

  const coordinator =
    new IntelligenceExecutionCoordinator(
      registry,
      resolver([first, second]),
      () => NOW,
    );

  const result =
    await coordinator
      .execute(
        executionInput(plan),
      )
      .result;

  assert.equal(result.status, 'succeeded');
  assert.equal(
    result.providerRef,
    PROVIDER_B,
  );
  assert.equal(result.attempts, 2);
  assert.equal(result.generation, 0);
  assert.equal(
    result.resultRef,
    'result_ref_fallback_22222222222',
  );
});

test('failure after partial output rotates generation before failover', async () => {
  const { registry, plan } =
    setupRegistry();

  const first =
    successAdapter(
      PROVIDER_A,
      MODEL_A,
      {
        partialThenFail: true,
      },
    );

  const second =
    successAdapter(
      PROVIDER_B,
      MODEL_B,
      {
        resultRef:
          'result_ref_generation2_22222222',
      },
    );

  const coordinator =
    new IntelligenceExecutionCoordinator(
      registry,
      resolver([first, second]),
      () => NOW,
    );

  const result =
    await coordinator
      .execute(
        executionInput(plan),
      )
      .result;

  assert.equal(result.status, 'succeeded');
  assert.equal(
    result.providerRef,
    PROVIDER_B,
  );
  assert.equal(result.attempts, 2);
  assert.equal(result.generation, 1);
});

test('non-retryable failure does not cross provider boundary', async () => {
  const { registry, plan } =
    setupRegistry();

  const first =
    successAdapter(
      PROVIDER_A,
      MODEL_A,
      {
        fail: {
          code: 'permission_denied',
          retryable: true,
          providerSafeMessage: null,
        },
      },
    );

  const second =
    successAdapter(
      PROVIDER_B,
      MODEL_B,
    );

  const coordinator =
    new IntelligenceExecutionCoordinator(
      registry,
      resolver([first, second]),
      () => NOW,
    );

  const result =
    await coordinator
      .execute(
        executionInput(plan),
      )
      .result;

  assert.equal(result.status, 'failed');
  assert.equal(
    result.providerRef,
    PROVIDER_A,
  );
  assert.equal(result.attempts, 1);
  assert.equal(
    result.failureCode,
    'permission_denied',
  );
});

test('resolver cannot substitute an adapter with a different identity', async () => {
  const { registry, plan } =
    setupRegistry();

  const wrong =
    successAdapter(
      PROVIDER_B,
      MODEL_B,
    );
  const correctFallback =
    successAdapter(
      PROVIDER_B,
      MODEL_B,
      {
        resultRef:
          'result_ref_identity_fallback_22222',
      },
    );

  const customResolver = {
    resolve(binding) {
      if (
        binding.providerRef === PROVIDER_A
      ) {
        return wrong;
      }
      return correctFallback;
    },
  };

  const coordinator =
    new IntelligenceExecutionCoordinator(
      registry,
      customResolver,
      () => NOW,
    );

  const result =
    await coordinator
      .execute(
        executionInput(plan),
      )
      .result;

  assert.equal(result.status, 'succeeded');
  assert.equal(
    result.providerRef,
    PROVIDER_B,
  );
  assert.equal(result.attempts, 2);
});

test('user cancellation terminates a hanging provider attempt', async () => {
  const { registry, plan } =
    setupRegistry();

  let providerCancelled = 0;

  const hanging = {
    providerRef: PROVIDER_A,
    modelRef: MODEL_A,
    service: 'general',
    async invoke() {
      return {
        async cancel() {
          providerCancelled += 1;
        },
      };
    },
  };

  const coordinator =
    new IntelligenceExecutionCoordinator(
      registry,
      resolver([hanging]),
      () => NOW,
    );

  const task =
    coordinator.execute(
      executionInput(plan),
    );

  await new Promise(
    (resolve) => setTimeout(resolve, 0),
  );

  task.cancel();

  const result = await task.result;

  assert.equal(result.status, 'cancelled');
  assert.equal(
    result.failureCode,
    'cancelled',
  );

  await new Promise(
    (resolve) => setTimeout(resolve, 0),
  );

  assert.equal(providerCancelled, 1);
});

test('attempt budget prevents unbounded provider retries', async () => {
  const { registry, plan } =
    setupRegistry();

  const coordinator =
    new IntelligenceExecutionCoordinator(
      registry,
      resolver([
        successAdapter(
          PROVIDER_A,
          MODEL_A,
          {
            fail: {
              code: 'timeout',
              retryable: true,
              providerSafeMessage: null,
            },
          },
        ),
        successAdapter(
          PROVIDER_B,
          MODEL_B,
        ),
      ]),
      () => NOW,
    );

  const result =
    await coordinator
      .execute(
        executionInput(
          plan,
          {
            maxAttempts: 1,
          },
        ),
      )
      .result;

  assert.equal(result.status, 'failed');
  assert.equal(result.attempts, 1);
  assert.equal(
    result.failureCode,
    'timeout',
  );
});
