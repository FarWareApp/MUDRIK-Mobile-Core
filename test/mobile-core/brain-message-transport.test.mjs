import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  BrainMessageTransport,
  BrainTransportProtocolError,
  BrainTransportRemoteError,
} = loadTypeScriptModule(
  'src/core/brain/BrainMessageTransport.ts',
);

const {
  TransportCancelledError,
} = loadTypeScriptModule(
  'src/contracts/TransportCancelledError.ts',
);

const NOW = 2_400_000_000;

function input() {
  return {
    id: 'message_1111111111111111',
    conversationId:
      'conversation_1111111111111111',
    kind: 'message',
    text: 'Hello',
    attachments: [],
    createdAt: NOW,
  };
}

function context() {
  return {
    requestId:
      'brain_request_1111111111111111',
    sessionId:
      'brain_session_1111111111111111',
    traceId:
      'brain_trace_1111111111111111',
    workspaceId: null,
    languageTag: 'en',
    deadlineAtMs: NOW + 60_000,
    transportPreference: 'interactive',
    requiresVerification: false,
  };
}

function outputEvent(overrides = {}) {
  return {
    protocolVersion: '1.0',
    eventId:
      'brain_event_1111111111111111',
    requestId:
      'brain_request_1111111111111111',
    sessionId:
      'brain_session_1111111111111111',
    traceId:
      'brain_trace_1111111111111111',
    conversationId:
      'conversation_1111111111111111',
    kind: 'text',
    sequence: 0,
    payloadRef:
      'payload_ref_output_111111111111',
    reasonCode: null,
    isFinal: true,
    observedAtMs: NOW + 100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function codec() {
  return {
    async encode() {
      return {
        payloadRef:
          'payload_ref_input_1111111111111',
        attachmentRefs: [],
      };
    },
    async decodeText(payloadRef) {
      assert.equal(
        payloadRef,
        'payload_ref_output_111111111111',
      );
      return 'Brain reply';
    },
  };
}

function factory() {
  return {
    create() {
      return context();
    },
  };
}

test('brain transport adapts a validated final text event to chat output', async () => {
  const port = {
    async submit(request, onOutput) {
      assert.equal(
        request.requestId,
        context().requestId,
      );

      queueMicrotask(
        () => onOutput(outputEvent()),
      );

      return {
        requestId: request.requestId,
        async cancel() {},
      };
    },
  };

  const transport =
    new BrainMessageTransport(
      port,
      codec(),
      factory(),
    );

  const task = transport.send(input());
  const result = await task.result;

  assert.deepEqual(result, {
    id: 'brain_event_1111111111111111',
    conversationId:
      'conversation_1111111111111111',
    kind: 'text',
    text: 'Brain reply',
    createdAt: NOW + 100,
  });
});

test('brain transport surfaces typed remote errors', async () => {
  const port = {
    async submit(request, onOutput) {
      queueMicrotask(
        () => onOutput(
          outputEvent({
            kind: 'error',
            payloadRef: null,
            reasonCode: 'provider_unavailable',
          }),
        ),
      );

      return {
        requestId: request.requestId,
        async cancel() {},
      };
    },
  };

  const transport =
    new BrainMessageTransport(
      port,
      codec(),
      factory(),
    );

  await assert.rejects(
    transport.send(input()).result,
    (error) => {
      assert.ok(
        error instanceof BrainTransportRemoteError,
      );
      assert.equal(
        error.reasonCode,
        'provider_unavailable',
      );
      return true;
    },
  );
});

test('brain transport rejects cross-request output before decoding', async () => {
  let decoded = false;

  const customCodec = {
    ...codec(),
    async decodeText() {
      decoded = true;
      return 'must-not-decode';
    },
  };

  const port = {
    async submit(request, onOutput) {
      queueMicrotask(
        () => onOutput(
          outputEvent({
            requestId:
              'brain_request_9999999999999999',
          }),
        ),
      );

      return {
        requestId: request.requestId,
        async cancel() {},
      };
    },
  };

  const transport =
    new BrainMessageTransport(
      port,
      customCodec,
      factory(),
    );

  await assert.rejects(
    transport.send(input()).result,
    BrainTransportProtocolError,
  );

  assert.equal(decoded, false);
});

test('brain transport rejects mismatched request handles', async () => {
  const port = {
    async submit() {
      return {
        requestId:
          'brain_request_9999999999999999',
        async cancel() {},
      };
    },
  };

  const transport =
    new BrainMessageTransport(
      port,
      codec(),
      factory(),
    );

  await assert.rejects(
    transport.send(input()).result,
    BrainTransportProtocolError,
  );
});

test('cancellation before provider handle creation avoids unnecessary provider work', async () => {
  let cancelled = 0;
  let releaseSubmit;

  const submitReady =
    new Promise((resolve) => {
      releaseSubmit = resolve;
    });

  const port = {
    async submit(request) {
      await submitReady;
      return {
        requestId: request.requestId,
        async cancel() {
          cancelled += 1;
        },
      };
    },
  };

  const transport =
    new BrainMessageTransport(
      port,
      codec(),
      factory(),
    );

  const task = transport.send(input());
  task.cancel();
  task.cancel();

  await assert.rejects(
    task.result,
    TransportCancelledError,
  );

  releaseSubmit();
  await new Promise(
    (resolve) => setTimeout(resolve, 0),
  );

  assert.equal(cancelled, 0);
});

test('cancellation after provider handle creation propagates exactly once', async () => {
  let cancelled = 0;

  const port = {
    async submit(request) {
      return {
        requestId: request.requestId,
        async cancel() {
          cancelled += 1;
        },
      };
    },
  };

  const transport =
    new BrainMessageTransport(
      port,
      codec(),
      factory(),
    );

  const task = transport.send(input());

  await new Promise(
    (resolve) => setTimeout(resolve, 0),
  );

  task.cancel();
  task.cancel();

  await assert.rejects(
    task.result,
    TransportCancelledError,
  );

  await new Promise(
    (resolve) => setTimeout(resolve, 0),
  );

  assert.equal(cancelled, 1);
});

test('early output is buffered until request handle identity is validated', async () => {
  let decoded = false;
  let providerCancelled = 0;

  const customCodec = {
    ...codec(),
    async decodeText() {
      decoded = true;
      return 'must-not-decode';
    },
  };

  const port = {
    async submit(_request, onOutput) {
      onOutput(outputEvent());

      return {
        requestId:
          'brain_request_9999999999999999',
        async cancel() {
          providerCancelled += 1;
        },
      };
    },
  };

  const transport =
    new BrainMessageTransport(
      port,
      customCodec,
      factory(),
    );

  await assert.rejects(
    transport.send(input()).result,
    BrainTransportProtocolError,
  );

  assert.equal(decoded, false);
  assert.equal(providerCancelled, 1);
});
