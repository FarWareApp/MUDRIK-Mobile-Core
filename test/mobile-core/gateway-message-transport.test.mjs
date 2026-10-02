import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GatewayMessageTransport,
  GatewayTransportProtocolError,
  GatewayTransportRemoteError,
} = loadTypeScriptModule(
  'src/core/intelligence/GatewayMessageTransport.ts',
);

const {
  TransportCancelledError,
} = loadTypeScriptModule(
  'src/contracts/TransportCancelledError.ts',
);

const encoder = new TextEncoder();

function streamResponse(
  chunks,
  status = 200,
) {
  return {
    ok:
      status >= 200
      && status < 300,
    status,
    body: status === 200
      ? new ReadableStream({
          start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(
                encoder.encode(chunk),
              );
            }
            controller.close();
          },
        })
      : null,
  };
}

function input() {
  return {
    id:
      'user_1111111111111111',
    conversationId:
      'conversation_1111111111111111',
    kind: 'message',
    text: 'مرحبا',
    attachments: [],
    createdAt: 1000,
  };
}

test(
  'gateway transport streams ordered deltas and returns final assistant message',
  async () => {
    let observedBody;
    let observedAuthorization;

    const transport =
      new GatewayMessageTransport(
        'https://gateway.example/chat',
        async () =>
          'session-token-abcdefghijkl',
        () => 'ar',
        async (_url, init) => {
          observedBody =
            JSON.parse(init.body);
          observedAuthorization =
            init.headers.authorization;

          return streamResponse([
            'event: delta\n'
              + 'data: {"sequence":1,"delta":"أه"}\n\n',
            'event: delta\n'
              + 'data: {"sequence":2,"delta":"لاً"}\n\n',
            'event: final\n'
              + 'data: {"id":"assistant_1","text":"أهلاً","createdAt":2000}\n\n',
          ]);
        },
      );

    const task =
      transport.send(input());
    const deltas = [];

    task.subscribe((event) => {
      deltas.push(event.delta);
    });

    const result =
      await task.result;

    assert.equal(
      observedAuthorization,
      'Bearer session-token-abcdefghijkl',
    );
    assert.equal(
      'providerRef'
        in observedBody,
      false,
    );
    assert.equal(
      'modelRef'
        in observedBody,
      false,
    );
    assert.equal(
      observedBody.languageTag,
      'ar',
    );
    assert.deepEqual(
      deltas,
      ['أه', 'لاً'],
    );
    assert.deepEqual(
      result,
      {
        id: 'assistant_1',
        conversationId:
          'conversation_1111111111111111',
        kind: 'text',
        text: 'أهلاً',
        createdAt: 2000,
      },
    );
  },
);

test(
  'out-of-order stream fails closed',
  async () => {
    const transport =
      new GatewayMessageTransport(
        'https://gateway.example/chat',
        async () =>
          'session-token-abcdefghijkl',
        () => 'ar',
        async () =>
          streamResponse([
            'event: delta\n'
              + 'data: {"sequence":2,"delta":"x"}\n\n',
          ]),
      );

    await assert.rejects(
      transport.send(input()).result,
      GatewayTransportProtocolError,
    );
  },
);

test(
  'typed gateway error is surfaced without response body leakage',
  async () => {
    const transport =
      new GatewayMessageTransport(
        'https://gateway.example/chat',
        async () =>
          'session-token-abcdefghijkl',
        () => 'de',
        async () =>
          streamResponse([
            'event: error\n'
              + 'data: {"code":"rate_limited","retryable":true}\n\n',
          ]),
      );

    await assert.rejects(
      transport.send(input()).result,
      (error) => {
        assert.ok(
          error instanceof
            GatewayTransportRemoteError,
        );
        assert.equal(
          error.reasonCode,
          'rate_limited',
        );
        return true;
      },
    );
  },
);

test(
  'cancellation aborts request with typed cancellation error',
  async () => {
    let abortSignal;

    const transport =
      new GatewayMessageTransport(
        'https://gateway.example/chat',
        async () =>
          'session-token-abcdefghijkl',
        () => 'en',
        async (_url, init) => {
          abortSignal =
            init.signal;

          return await new Promise(
            (_resolve, reject) => {
              init.signal
                .addEventListener(
                  'abort',
                  () => {
                    const error =
                      new DOMException(
                        'aborted',
                        'AbortError',
                      );
                    reject(error);
                  },
                  { once: true },
                );
            },
          );
        },
      );

    const task =
      transport.send(input());

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 0),
    );

    task.cancel();

    await assert.rejects(
      task.result,
      TransportCancelledError,
    );

    assert.equal(
      abortSignal.aborted,
      true,
    );
  },
);
