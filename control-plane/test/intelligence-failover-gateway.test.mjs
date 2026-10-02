import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IntelligenceProviderGateway,
} from '../src/intelligence-provider-gateway.mjs';

const BASE = {
  protocolVersion: '1.0',
  requestId:
    'gateway_request_1111111111111111',
  service: 'general',
  languageTag: 'ar',
  inputText: 'مرحبا',
  streaming: true,
  maxOutputTokens: 1024,
  deadlineAtMs: null,
};

const A = {
  providerRef:
    'provider_alpha_1111111111111111',
  modelRef:
    'model_alpha_1111111111111111',
};

const B = {
  providerRef:
    'provider_beta_2222222222222222',
  modelRef:
    'model_beta_2222222222222222',
};

function adapter(
  route,
  invoke,
) {
  return {
    ...route,
    invoke,
  };
}

test(
  'retryable pre-stream failure advances to fallback',
  async () => {
    const attempts = [];

    const gateway =
      new IntelligenceProviderGateway([
        adapter(
          A,
          async () => ({
            ok: false,
            code: 'rate_limited',
            retryable: true,
            status: 429,
          }),
        ),
        adapter(
          B,
          async () => ({
            ok: true,
            providerRef:
              B.providerRef,
            modelRef:
              B.modelRef,
            providerResponseRef:
              'response_ref_2222222222222222',
            text: 'ok',
            usage: null,
          }),
        ),
      ]);

    const result =
      await gateway.invokePlan(
        BASE,
        [A, B],
        {
          onAttempt(value) {
            attempts.push(
              value.providerRef,
            );
          },
        },
      );

    assert.equal(result.ok, true);
    assert.equal(result.routeIndex, 1);
    assert.equal(result.attempts, 2);
    assert.deepEqual(
      attempts,
      [
        A.providerRef,
        B.providerRef,
      ],
    );
  },
);

test(
  'partial streamed output never mixes a second provider',
  async () => {
    let fallbackCalled = false;
    const deltas = [];

    const gateway =
      new IntelligenceProviderGateway([
        adapter(
          A,
          async (_request, options) => {
            await options.onDelta({
              sequence: 1,
              delta: 'جز',
            });

            return {
              ok: false,
              code:
                'provider_generation_failed',
              retryable: true,
              status: null,
            };
          },
        ),
        adapter(
          B,
          async () => {
            fallbackCalled = true;
            return {
              ok: true,
            };
          },
        ),
      ]);

    const result =
      await gateway.invokePlan(
        BASE,
        [A, B],
        {
          onDelta(event) {
            deltas.push(event.delta);
          },
        },
      );

    assert.equal(
      result.ok,
      false,
    );
    assert.equal(
      result.code,
      'partial_stream_failure',
    );
    assert.equal(
      result.retryable,
      false,
    );
    assert.equal(
      fallbackCalled,
      false,
    );
    assert.deepEqual(
      deltas,
      ['جز'],
    );
  },
);

test(
  'non-retryable provider failure stops failover',
  async () => {
    let fallbackCalled = false;

    const gateway =
      new IntelligenceProviderGateway([
        adapter(
          A,
          async () => ({
            ok: false,
            code: 'provider_rejected',
            retryable: false,
            status: 400,
          }),
        ),
        adapter(
          B,
          async () => {
            fallbackCalled = true;
            return { ok: true };
          },
        ),
      ]);

    const result =
      await gateway.invokePlan(
        BASE,
        [A, B],
      );

    assert.equal(
      result.code,
      'provider_rejected',
    );
    assert.equal(
      result.routeIndex,
      0,
    );
    assert.equal(
      fallbackCalled,
      false,
    );
  },
);

test(
  'route plan rejects duplicate providers and models',
  async () => {
    const gateway =
      new IntelligenceProviderGateway();

    const result =
      await gateway.invokePlan(
        BASE,
        [A, A],
      );

    assert.equal(
      result.code,
      'invalid_route_plan',
    );
    assert.equal(
      result.retryable,
      false,
    );
  },
);
