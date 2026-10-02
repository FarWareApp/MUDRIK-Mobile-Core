import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  parseBrainInputEnvelope,
  parseBrainOutputEvent,
} = loadTypeScriptModule(
  'src/core/brain/brainEnvelope.ts',
);

const {
  BrainStreamTracker,
} = loadTypeScriptModule(
  'src/core/brain/brainStream.ts',
);

const {
  BrainRequestRegistry,
} = loadTypeScriptModule(
  'src/core/brain/brainRequestRegistry.ts',
);

const NOW = 2_100_000_000;

function request(overrides = {}) {
  return {
    protocolVersion: '1.0',
    requestId:
      'brain_request_1111111111111111',
    sessionId:
      'brain_session_1111111111111111',
    traceId:
      'brain_trace_1111111111111111',
    conversationId:
      'conversation_1111111111111111',
    workspaceId:
      'workspace_1111111111111111',
    kind: 'text',
    payloadRef:
      'payload_ref_1111111111111111',
    attachmentRefs: [],
    languageTag: 'AR',
    createdAtMs: NOW,
    deadlineAtMs: NOW + 60_000,
    transportPreference: 'interactive',
    requiresVerification: false,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function event(overrides = {}) {
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
      'payload_ref_2222222222222222',
    reasonCode: null,
    isFinal: false,
    observedAtMs: NOW + 100,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

test('brain input envelope is strict bounded and authority-free', () => {
  const parsed =
    parseBrainInputEnvelope(request());

  assert.ok(parsed);
  assert.equal(parsed.languageTag, 'ar');
  assert.equal(
    parsed.grantsExecutionAuthority,
    false,
  );

  assert.equal(
    parseBrainInputEnvelope({
      ...request(),
      hiddenPrompt: 'override',
    }),
    null,
  );

  assert.equal(
    parseBrainInputEnvelope({
      ...request(),
      grantsCapabilityAuthority: true,
    }),
    null,
  );
});

test('brain input rejects duplicate attachments and invalid deadlines', () => {
  const duplicate =
    'attachment_ref_1111111111111111';

  assert.equal(
    parseBrainInputEnvelope(
      request({
        attachmentRefs: [
          duplicate,
          duplicate,
        ],
      }),
    ),
    null,
  );

  assert.equal(
    parseBrainInputEnvelope(
      request({
        deadlineAtMs: NOW,
      }),
    ),
    null,
  );
});

test('brain output enforces error and payload semantics', () => {
  assert.ok(
    parseBrainOutputEvent(event()),
  );

  assert.ok(
    parseBrainOutputEvent(
      event({
        kind: 'error',
        payloadRef: null,
        reasonCode: 'provider_unavailable',
        isFinal: true,
      }),
    ),
  );

  assert.equal(
    parseBrainOutputEvent(
      event({
        kind: 'error',
        reasonCode: null,
        payloadRef:
          'payload_ref_3333333333333333',
      }),
    ),
    null,
  );

  assert.equal(
    parseBrainOutputEvent(
      event({
        kind: 'text',
        reasonCode: 'unexpected',
      }),
    ),
    null,
  );
});

test('stream tracker enforces ordering identity and idempotence', () => {
  const tracker =
    new BrainStreamTracker(request());

  const first = event();
  assert.deepEqual(
    tracker.accept(first),
    {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
      state: {
        phase: 'streaming',
        nextSequence: 1,
        eventCount: 1,
        lastObservedAtMs: NOW + 100,
        finalEventId: null,
      },
    },
  );

  assert.equal(
    tracker.accept(first).reason,
    'idempotent',
  );

  assert.equal(
    tracker.accept(
      event({
        eventId:
          'brain_event_2222222222222222',
        sequence: 0,
        payloadRef:
          'payload_ref_3333333333333333',
      }),
    ).reason,
    'sequence_conflict',
  );

  assert.equal(
    tracker.accept(
      event({
        eventId:
          'brain_event_3333333333333333',
        sequence: 2,
      }),
    ).reason,
    'sequence_gap',
  );
});

test('stream tracker closes on final and rejects later output', () => {
  const tracker =
    new BrainStreamTracker(request());

  assert.equal(
    tracker.accept(
      event({
        isFinal: true,
      }),
    ).state.phase,
    'completed',
  );

  assert.equal(
    tracker.accept(
      event({
        eventId:
          'brain_event_2222222222222222',
        sequence: 1,
        isFinal: true,
      }),
    ).reason,
    'lifecycle_closed',
  );
});

test('stream tracker rejects time rollback and late non-timeout output', () => {
  const tracker =
    new BrainStreamTracker(request());

  assert.equal(
    tracker.accept(
      event({
        observedAtMs: NOW - 1,
      }),
    ).reason,
    'time_rollback',
  );

  assert.equal(
    tracker.accept(
      event({
        observedAtMs: NOW + 60_001,
      }),
    ).reason,
    'deadline_exceeded',
  );

  const timeout = tracker.accept(
    event({
      kind: 'error',
      payloadRef: null,
      reasonCode: 'deadline_exceeded',
      isFinal: true,
      observedAtMs: NOW + 60_001,
    }),
  );

  assert.equal(timeout.accepted, true);
  assert.equal(timeout.state.phase, 'failed');
});

test('cancellation is idempotent and terminal', () => {
  const tracker =
    new BrainStreamTracker(request());

  assert.equal(
    tracker.cancel().state.phase,
    'cancelled',
  );
  assert.equal(
    tracker.cancel().idempotent,
    true,
  );
  assert.equal(
    tracker.accept(event()).reason,
    'lifecycle_closed',
  );
});

test('request registry detects replay conflicts and releases only terminal work', () => {
  const registry =
    new BrainRequestRegistry(2);

  const first =
    registry.register(request());

  assert.equal(first.accepted, true);
  assert.equal(first.duplicate, false);
  assert.ok(first.tracker);

  const duplicate =
    registry.register(request());

  assert.equal(duplicate.accepted, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(
    duplicate.tracker,
    first.tracker,
  );

  const conflict =
    registry.register(
      request({
        payloadRef:
          'payload_ref_9999999999999999',
      }),
    );

  assert.equal(conflict.accepted, false);
  assert.equal(
    conflict.reason,
    'replay_conflict',
  );

  assert.equal(
    registry.release(
      'brain_request_1111111111111111',
    ),
    false,
  );

  first.tracker.cancel();

  assert.equal(
    registry.release(
      'brain_request_1111111111111111',
    ),
    true,
  );
  assert.equal(registry.size(), 0);
});

test('request registry is capacity bounded', () => {
  const registry =
    new BrainRequestRegistry(1);

  assert.equal(
    registry.register(request()).reason,
    'registered',
  );

  assert.equal(
    registry.register(
      request({
        requestId:
          'brain_request_2222222222222222',
        traceId:
          'brain_trace_2222222222222222',
        payloadRef:
          'payload_ref_2222222222222222',
      }),
    ).reason,
    'capacity_exceeded',
  );
});

test('stream tracker applies a hard event-count bound', () => {
  const tracker =
    new BrainStreamTracker(
      request(),
      1,
    );

  assert.equal(
    tracker.accept(
      event({
        isFinal: false,
      }),
    ).accepted,
    true,
  );

  assert.equal(
    tracker.accept(
      event({
        eventId:
          'brain_event_2222222222222222',
        sequence: 1,
        payloadRef:
          'payload_ref_3333333333333333',
        observedAtMs: NOW + 101,
      }),
    ).reason,
    'event_limit_exceeded',
  );
});
