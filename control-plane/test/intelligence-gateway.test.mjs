import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseGatewayRequest,
} from '../src/intelligence-gateway-contract.mjs';

import {
  OpenAIResponsesAdapter,
} from '../src/openai-responses-adapter.mjs';

import {
  IntelligenceProviderGateway,
} from '../src/intelligence-provider-gateway.mjs';

const PROVIDER =
  'provider_openai_1111111111111111';
const MODEL =
  'model_general_1111111111111111';

function request(overrides = {}) {
  return {
    protocolVersion: '1.0',
    requestId:
      'gateway_request_1111111111111111',
    providerRef: PROVIDER,
    modelRef: MODEL,
    service: 'general',
    languageTag: 'ar',
    inputText: 'مرحبا',
    streaming: false,
    maxOutputTokens: 1024,
    deadlineAtMs: null,
    ...overrides,
  };
}

test(
  'gateway request is strict and bounded',
  () => {
    assert.ok(
      parseGatewayRequest(request()),
    );

    assert.equal(
      parseGatewayRequest({
        ...request(),
        hiddenAuthority: true,
      }),
      null,
    );

    assert.equal(
      parseGatewayRequest(
        request({
          maxOutputTokens: 100_000,
        }),
      ),
      null,
    );
  },
);

test(
  'OpenAI adapter keeps credential server-side and disables provider storage',
  async () => {
    let observed;

    const adapter =
      new OpenAIResponsesAdapter({
        providerRef: PROVIDER,
        modelRef: MODEL,
        apiModel: 'gpt-6-luna',
        credentialRef:
          'secret_ref_openai_primary',
        credentialResolver:
          async () =>
            'sk-test-abcdefghijklmnopqrstuvwxyz',
        fetchImpl:
          async (url, init) => {
            observed = { url, init };

            return {
              ok: true,
              status: 200,
              async json() {
                return {
                  id: 'resp_test_123',
                  output: [
                    {
                      type: 'message',
                      content: [
                        {
                          type: 'output_text',
                          text: 'أهلاً',
                        },
                      ],
                    },
                  ],
                  usage: {
                    input_tokens: 4,
                    output_tokens: 3,
                  },
                };
              },
            };
          },
      });

    const result =
      await adapter.invoke(
        parseGatewayRequest(request()),
      );

    assert.equal(result.ok, true);
    assert.equal(result.text, 'أهلاً');

    const sent =
      JSON.parse(observed.init.body);

    assert.equal(
      observed.url,
      'https://api.openai.com/v1/responses',
    );
    assert.equal(sent.store, false);
    assert.equal(sent.model, 'gpt-6-luna');
    assert.equal(
      sent.input[0].content[0].text,
      'مرحبا',
    );
    assert.match(
      observed.init.headers.authorization,
      /^Bearer sk-test-/,
    );
    assert.equal(
      JSON.stringify(result)
        .includes('sk-test-'),
      false,
    );
  },
);

test(
  'provider failures are normalized without exposing response bodies',
  async () => {
    const adapter =
      new OpenAIResponsesAdapter({
        providerRef: PROVIDER,
        modelRef: MODEL,
        apiModel: 'gpt-6-luna',
        credentialRef:
          'secret_ref_openai_primary',
        credentialResolver:
          async () =>
            'sk-test-abcdefghijklmnopqrstuvwxyz',
        fetchImpl:
          async () => ({
            ok: false,
            status: 429,
          }),
      });

    const result =
      await adapter.invoke(
        parseGatewayRequest(request()),
      );

    assert.deepEqual(result, {
      ok: false,
      code: 'rate_limited',
      retryable: true,
      status: 429,
    });
  },
);

test(
  'gateway only invokes registered provider-model routes',
  async () => {
    const adapter = {
      providerRef: PROVIDER,
      modelRef: MODEL,
      async invoke(value) {
        return {
          ok: true,
          providerRef: PROVIDER,
          modelRef: MODEL,
          providerResponseRef:
            'response_ref_1111111111111111',
          text: value.inputText,
          usage: null,
        };
      },
    };

    const gateway =
      new IntelligenceProviderGateway([
        adapter,
      ]);

    assert.equal(
      (
        await gateway.invoke(request())
      ).ok,
      true,
    );

    const missing =
      await gateway.invoke(
        request({
          modelRef:
            'model_missing_2222222222222222',
        }),
      );

    assert.equal(
      missing.code,
      'route_unavailable',
    );
  },
);

test(
  'expired request is rejected before provider invocation',
  async () => {
    let called = false;

    const gateway =
      new IntelligenceProviderGateway([
        {
          providerRef: PROVIDER,
          modelRef: MODEL,
          async invoke() {
            called = true;
            return { ok: true };
          },
        },
      ]);

    const result =
      await gateway.invoke(
        request({
          deadlineAtMs: 1000,
        }),
        {
          now: () => 1000,
        },
      );

    assert.equal(
      result.code,
      'deadline_exceeded',
    );
    assert.equal(called, false);
  },
);
