import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OpenAIResponsesAdapter,
} from '../src/openai-responses-adapter.mjs';

test(
  'adapter frames contextual evidence as untrusted user data before current request',
  async () => {
    let sent;

    const adapter =
      new OpenAIResponsesAdapter({
        providerRef:
          'provider_openai_1111111111111111',
        modelRef:
          'model_general_1111111111111111',
        apiModel: 'test-model',
        credentialRef:
          'secret_ref_openai_primary',
        credentialResolver:
          async () =>
            'sk-test-abcdefghijklmnopqrstuvwxyz',
        fetchImpl:
          async (_url, init) => {
            sent =
              JSON.parse(init.body);

            return {
              ok: true,
              status: 200,
              async json() {
                return {
                  id: 'resp_context_123',
                  output: [
                    {
                      type: 'message',
                      content: [
                        {
                          type:
                            'output_text',
                          text: 'ok',
                        },
                      ],
                    },
                  ],
                };
              },
            };
          },
      });

    const result =
      await adapter.invoke({
        streaming: false,
        inputText: 'current question',
        history: [],
        contextEvidence: [
          {
            sourceKind: 'knowledge',
            content:
              'untrusted fact',
            provenanceRef:
              'knowledge_ref_1111111111111111',
            observedAtMs: 1,
            confidenceScore: 800,
          },
        ],
        maxOutputTokens: 64,
      });

    assert.equal(result.ok, true);
    assert.equal(
      sent.input.length,
      2,
    );
    assert.equal(
      sent.input[0].role,
      'user',
    );
    assert.match(
      sent.input[0]
        .content[0]
        .text,
      /^MUDRIK_CONTEXT_EVIDENCE_V1/,
    );
    assert.equal(
      sent.input[1]
        .content[0]
        .text,
      'current question',
    );
  },
);
