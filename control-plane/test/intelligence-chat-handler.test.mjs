import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createIntelligenceChatHandler,
} from '../src/intelligence-chat-handler.mjs';

function publicRequest(
  overrides = {},
) {
  return {
    protocolVersion: '1.0',
    requestId:
      'gateway_request_1111111111111111',
    conversationId:
      'conversation_1111111111111111',
    languageTag: 'ar',
    inputText: 'مرحبا',
    history: [],
    streaming: true,
    ...overrides,
  };
}

function makeRequest(
  body = publicRequest(),
  headers = {},
) {
  return new Request(
    'https://gateway.example/chat',
    {
      method: 'POST',
      headers: {
        authorization:
          'Bearer session-token-abcdefghijkl',
        'content-type':
          'application/json',
        ...headers,
      },
      body:
        typeof body === 'string'
          ? body
          : JSON.stringify(body),
    },
  );
}

function handler(overrides = {}) {
  return createIntelligenceChatHandler({
    gateway: {
      async invoke(
        request,
        options,
      ) {
        await options.onDelta({
          sequence: 1,
          delta: 'أه',
        });
        await options.onDelta({
          sequence: 2,
          delta: 'لاً',
        });

        return {
          ok: true,
          providerResponseRef:
            'resp_test_123',
          text: 'أهلاً',
          usage: null,
        };
      },
    },
    authenticateBearer:
      async () => ({
        subjectRef:
          'subject_1111111111111111',
      }),
    routeSelector:
      async () => ({
        providerRef:
          'provider_openai_1111111111111111',
        modelRef:
          'model_general_1111111111111111',
        maxOutputTokens: 1024,
      }),
    clock: () => 6000,
    ...overrides,
  });
}

test(
  'chat handler authenticates then streams deltas and final event',
  async () => {
    const response =
      await handler()(
        makeRequest(),
      );

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.text();

    assert.match(
      body,
      /event: delta/,
    );
    assert.match(
      body,
      /"sequence":1/,
    );
    assert.match(
      body,
      /event: final/,
    );
    assert.match(
      body,
      /"text":"أهلاً"/,
    );
  },
);

test(
  'provider and model cannot be injected by mobile request',
  async () => {
    const response =
      await handler()(
        makeRequest({
          ...publicRequest(),
          providerRef:
            'provider_attacker_111111111111',
        }),
      );

    assert.equal(
      response.status,
      400,
    );
  },
);

test(
  'missing or invalid bearer token fails before gateway invocation',
  async () => {
    let invoked = false;

    const response =
      await handler({
        gateway: {
          async invoke() {
            invoked = true;
            return {
              ok: true,
            };
          },
        },
        authenticateBearer:
          async () => null,
      })(
        makeRequest(),
      );

    assert.equal(
      response.status,
      401,
    );
    assert.equal(
      invoked,
      false,
    );
  },
);

test(
  'route failure is normalized without exposing internals',
  async () => {
    const response =
      await handler({
        routeSelector:
          async () => null,
      })(
        makeRequest(),
      );

    assert.equal(
      response.status,
      503,
    );

    assert.deepEqual(
      await response.json(),
      {
        code: 'route_unavailable',
      },
    );
  },
);

test(
  'gateway error is streamed as typed event',
  async () => {
    const response =
      await handler({
        gateway: {
          async invoke() {
            return {
              ok: false,
              code: 'rate_limited',
              retryable: true,
              status: 429,
            };
          },
        },
      })(
        makeRequest(),
      );

    const body =
      await response.text();

    assert.match(
      body,
      /event: error/,
    );
    assert.match(
      body,
      /"code":"rate_limited"/,
    );
    assert.equal(
      body.includes('429'),
      false,
    );
  },
);


test(
  'chat handler accepts a bounded server-selected failover plan',
  async () => {
    const seen = [];

    const response =
      await handler({
        gateway: {
          async invokePlan(
            request,
            candidates,
            options,
          ) {
            seen.push(
              ...candidates,
            );

            await options.onDelta({
              sequence: 1,
              delta: 'ok',
            });

            return {
              ok: true,
              providerResponseRef:
                'resp_fallback_123',
              text: 'ok',
              usage: null,
              routeIndex: 1,
              attempts: 2,
            };
          },
        },
        routeSelector:
          async () => ({
            candidates: [
              {
                providerRef:
                  'provider_alpha_1111111111111111',
                modelRef:
                  'model_alpha_1111111111111111',
              },
              {
                providerRef:
                  'provider_beta_2222222222222222',
                modelRef:
                  'model_beta_2222222222222222',
              },
            ],
            maxOutputTokens: 1024,
          }),
      })(
        makeRequest(),
      );

    assert.equal(
      response.status,
      200,
    );

    await response.text();

    assert.equal(
      seen.length,
      2,
    );
  },
);


test('chat handler forwards validated conversation history only to the server-selected route', async () => {
  let observed;

  const response = await handler({
    gateway: {
      async invokePlan(request) {
        observed = request;
        return {
          ok: true,
          providerResponseRef: 'resp_history_123',
          text: 'ok',
          usage: null,
          routeIndex: 0,
          attempts: 1,
        };
      },
    },
  })(makeRequest(publicRequest({
    history: [
      { role: 'user', text: 'old question' },
      { role: 'assistant', text: 'old answer' },
    ],
  })));

  assert.equal(response.status, 200);
  await response.text();

  assert.deepEqual(observed.history, [
    { role: 'user', text: 'old question' },
    { role: 'assistant', text: 'old answer' },
  ]);
});
