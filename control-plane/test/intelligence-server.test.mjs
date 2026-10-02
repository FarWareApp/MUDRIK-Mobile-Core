import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildIntelligenceRuntime,
  resolveGatewayPort,
} from '../src/intelligence-server.mjs';

const env = {
  OPENAI_API_KEY:
    'sk-test-abcdefghijklmnopqrstuvwxyz',
  MUDRIK_OPENAI_MODEL:
    'test-model',
  MUDRIK_OPENAI_FAST_MODEL:
    'test-fast-model',
  MUDRIK_GATEWAY_ACCESS_TOKEN:
    'gateway-access-token-abcdefghijklmnopqrstuvwxyz',
  MUDRIK_GATEWAY_SESSION_SECRET:
    'session-signing-secret-abcdefghijklmnopqrstuvwxyz-0123456789',
};

test(
  'production gateway requires all secrets and model selection from server environment',
  () => {
    const runtime =
      buildIntelligenceRuntime(
        env,
        async () => {
          throw new Error(
            'not-called',
          );
        },
      );

    assert.equal(
      runtime.providerRef,
      'provider_openai_1111111111111111',
    );

    assert.equal(
      runtime.modelRef,
      'model_general_1111111111111111',
    );

    assert.equal(
      runtime.fastModelRef,
      'model_fast_2222222222222222',
    );
  },
);

test(
  'missing OpenAI key or access token fails closed at startup',
  () => {
    assert.throws(
      () =>
        buildIntelligenceRuntime(
          {
            ...env,
            OPENAI_API_KEY: '',
          },
        ),
      /OPENAI_API_KEY/,
    );

    assert.throws(
      () =>
        buildIntelligenceRuntime(
          {
            ...env,
            MUDRIK_GATEWAY_ACCESS_TOKEN:
              'short',
          },
        ),
      /MUDRIK_GATEWAY_ACCESS_TOKEN/,
    );
  },
);

test(
  'gateway access token is checked before provider invocation',
  async () => {
    let providerCalled = false;

    const runtime =
      buildIntelligenceRuntime(
        env,
        async () => {
          providerCalled = true;
          return {
            ok: true,
            status: 200,
          };
        },
      );

    const response =
      await runtime.chatHandler(
        new Request(
          'https://gateway.example/v1/chat',
          {
            method: 'POST',
            headers: {
              authorization:
                'Bearer wrong-token-abcdefghijklmnopqrstuvwxyz',
              'content-type':
                'application/json',
            },
            body: JSON.stringify({
              protocolVersion:
                '1.0',
              requestId:
                'gateway_request_1111111111111111',
              conversationId:
                'conversation_1111111111111111',
              languageTag: 'ar',
              inputText: 'مرحبا',
              streaming: true,
            }),
          },
        ),
      );

    assert.equal(
      response.status,
      401,
    );
    assert.equal(
      providerCalled,
      false,
    );
  },
);

test(
  'port parsing is strict',
  () => {
    assert.equal(
      resolveGatewayPort({
        PORT: '8080',
      }),
      8080,
    );

    assert.throws(
      () =>
        resolveGatewayPort({
          PORT: '70000',
        }),
      /Invalid PORT/,
    );
  },
);
