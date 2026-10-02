import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GatewayMessageTransport,
  GatewayTransportProtocolError,
} = loadTypeScriptModule(
  'src/core/intelligence/GatewayMessageTransport.ts',
);

const encoder = new TextEncoder();

function response() {
  return {
    ok: true,
    status: 200,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: final\n'
            + 'data: {"id":"assistant_1","text":"ok","createdAt":2}\n\n',
          ),
        );
        controller.close();
      },
    }),
  };
}

function input(
  evidence,
) {
  return {
    id: 'user_1111111111111111',
    conversationId:
      'conversation_1111111111111111',
    kind: 'message',
    text: 'hello',
    attachments: [],
    history: [],
    contextEvidence: evidence,
    createdAt: 1,
  };
}

test(
  'mobile transport forwards bounded context evidence without authority fields',
  async () => {
    let body;

    const transport =
      new GatewayMessageTransport(
        'https://gateway.example/v1/chat',
        async () =>
          'session-token-abcdefghijklmnopqrstuvwxyz',
        () => 'en',
        async (_url, init) => {
          body =
            JSON.parse(init.body);
          return response();
        },
      );

    await transport.send(
      input([
        {
          sourceKind: 'memory',
          content: 'fact',
          provenanceRef:
            'memory_ref_1111111111111111',
          observedAtMs: 1,
          confidenceScore: 900,
        },
      ]),
    ).result;

    assert.deepEqual(
      body.contextEvidence,
      [
        {
          sourceKind: 'memory',
          content: 'fact',
          provenanceRef:
            'memory_ref_1111111111111111',
          observedAtMs: 1,
          confidenceScore: 900,
        },
      ],
    );

    assert.equal(
      JSON.stringify(
        body.contextEvidence,
      ).includes('authority'),
      false,
    );
  },
);

test(
  'mobile transport rejects malformed context before network call',
  async () => {
    let called = false;

    const transport =
      new GatewayMessageTransport(
        'https://gateway.example/v1/chat',
        async () =>
          'session-token-abcdefghijklmnopqrstuvwxyz',
        () => 'en',
        async () => {
          called = true;
          return response();
        },
      );

    await assert.rejects(
      transport.send(
        input([
          {
            sourceKind: 'memory',
            content: 'fact',
            provenanceRef: 'x',
            observedAtMs: 1,
            confidenceScore: 900,
          },
        ]),
      ).result,
      GatewayTransportProtocolError,
    );

    assert.equal(called, false);
  },
);
