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
    history: [],
    streaming: false,
    maxOutputTokens: 1024,
    deadlineAtMs: null,
    ...overrides,
  };
}

function adapter(overrides = {}) {
  return new OpenAIResponsesAdapter({
    providerRef: PROVIDER,
    modelRef: MODEL,
    apiModel: 'gpt-6-luna',
    credentialRef:
      'secret_ref_openai_primary',
    credentialResolver:
      async () =>
        'sk-test-abcdefghijklmnopqrstuvwxyz',
    ...overrides,
  });
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

    const client =
      adapter({
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
      await client.invoke(
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
  'streaming emits ordered deltas and returns final assembled text',
  async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"type":"response.output_text.delta","delta":"أه"}\n\n',
      'data: {"type":"response.output_text.delta","delta":"لاً"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp_stream_123","usage":{"input_tokens":4,"output_tokens":3}}}\n\n',
      'data: [DONE]\n\n',
    ];

    const client =
      adapter({
        fetchImpl:
          async (_url, init) => {
            const sent =
              JSON.parse(init.body);

            assert.equal(
              sent.stream,
              true,
            );

            return {
              ok: true,
              status: 200,
              body: {
                async *[
                  Symbol.asyncIterator
                ]() {
                  for (const chunk of chunks) {
                    yield encoder.encode(
                      chunk,
                    );
                  }
                },
              },
            };
          },
      });

    const deltas = [];

    const result =
      await client.invoke(
        parseGatewayRequest(
          request({
            streaming: true,
          }),
        ),
        {
          onDelta(event) {
            deltas.push(event);
          },
        },
      );

    assert.equal(result.ok, true);
    assert.equal(result.text, 'أهلاً');
    assert.equal(
      result.providerResponseRef,
      'resp_stream_123',
    );
    assert.deepEqual(
      deltas.map((item) => item.sequence),
      [1, 2],
    );
    assert.deepEqual(
      deltas.map((item) => item.delta),
      ['أه', 'لاً'],
    );
  },
);

test(
  'malformed provider stream fails closed',
  async () => {
    const encoder = new TextEncoder();

    const client =
      adapter({
        fetchImpl:
          async () => ({
            ok: true,
            status: 200,
            body: {
              async *[
                Symbol.asyncIterator
              ]() {
                yield encoder.encode(
                  'data: {not-json}\n\n',
                );
              },
            },
          }),
      });

    const result =
      await client.invoke(
        parseGatewayRequest(
          request({
            streaming: true,
          }),
        ),
      );

    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      'invalid_provider_stream',
    );
  },
);

test(
  'provider failures are normalized without exposing response bodies',
  async () => {
    const client =
      adapter({
        fetchImpl:
          async () => ({
            ok: false,
            status: 429,
          }),
      });

    const result =
      await client.invoke(
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
    const client = {
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
        client,
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
  'gateway forwards streaming deltas but never credentials',
  async () => {
    const observed = [];

    const gateway =
      new IntelligenceProviderGateway([
        {
          providerRef: PROVIDER,
          modelRef: MODEL,
          async invoke(
            value,
            options,
          ) {
            await options.onDelta?.({
              sequence: 1,
              delta: 'x',
            });

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
        },
      ]);

    const result =
      await gateway.invoke(
        request({
          streaming: true,
        }),
        {
          onDelta(value) {
            observed.push(value);
          },
        },
      );

    assert.equal(result.ok, true);
    assert.deepEqual(
      observed,
      [
        {
          sequence: 1,
          delta: 'x',
        },
      ],
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


test('OpenAI adapter preserves bounded conversation history before the new user turn', async () => {
  let sent;
  const client = adapter({
    fetchImpl: async (_url, init) => {
      sent = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            id: 'resp_history_123',
            output: [{
              type: 'message',
              content: [{ type: 'output_text', text: 'جواب' }],
            }],
          };
        },
      };
    },
  });

  const result = await client.invoke(
    parseGatewayRequest(request({
      history: [
        { role: 'user', text: 'سؤال سابق' },
        { role: 'assistant', text: 'جواب سابق' },
      ],
    })),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(
    sent.input.map((item) => [
      item.role,
      item.content[0].type,
      item.content[0].text,
    ]),
    [
      ['user', 'input_text', 'سؤال سابق'],
      ['assistant', 'output_text', 'جواب سابق'],
      ['user', 'input_text', 'مرحبا'],
    ],
  );
});

test('gateway contract rejects malformed conversation history', () => {
  assert.equal(
    parseGatewayRequest(request({
      history: [{ role: 'system', text: 'forbidden' }],
    })),
    null,
  );
  assert.equal(
    parseGatewayRequest(request({
      history: Array.from(
        { length: 49 },
        () => ({ role: 'user', text: 'x' }),
      ),
    })),
    null,
  );
});

test('OpenAI quota exhaustion is normalized as non-retryable', async () => {
  const client = adapter({
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      async json() {
        return {
          error: {
            type: 'insufficient_quota',
            code: 'credit_balance_exhausted',
          },
        };
      },
    }),
  });

  const result = await client.invoke(
    parseGatewayRequest(request()),
  );

  assert.deepEqual(result, {
    ok: false,
    code: 'quota_exhausted',
    retryable: false,
    status: 429,
  });
});
