import {
  createSecurityEvent,
  type SecurityEvent,
  type SecurityEventSeverity,
  type SecurityEventType,
} from '../security/securityEvent';
import type { VoiceSessionPhase } from './voiceSessionState';
import type { VoiceServiceKind } from './voiceProviderRouting';

export type VoiceAuditKind =
  | 'input_activation_denied'
  | 'stream_replay_rejected'
  | 'barge_in_rejected'
  | 'provider_failure'
  | 'lifecycle_violation';

const KINDS: readonly VoiceAuditKind[] = [
  'input_activation_denied',
  'stream_replay_rejected',
  'barge_in_rejected',
  'provider_failure',
  'lifecycle_violation',
];

const PHASES: readonly VoiceSessionPhase[] = [
  'idle',
  'listening',
  'user_speaking',
  'finalizing',
  'processing',
  'assistant_speaking',
  'cancelling',
  'ended',
  'error',
];

const SAFE_REF = /^[A-Za-z0-9._:@\/-]+$/;
const PROVIDER_REF = /^vp_[A-Za-z0-9_-]{8,80}$/;
const MAX_REF_LENGTH = 160;
const MAX_REASON_LENGTH = 160;

const EVENT_MAP: Readonly<
  Record<
    VoiceAuditKind,
    Readonly<{
      type: SecurityEventType;
      severity: SecurityEventSeverity;
    }>
  >
> = {
  input_activation_denied: {
    type: 'voice.input_activation_denied',
    severity: 'warning',
  },
  stream_replay_rejected: {
    type: 'voice.stream_replay_rejected',
    severity: 'warning',
  },
  barge_in_rejected: {
    type: 'voice.barge_in_rejected',
    severity: 'info',
  },
  provider_failure: {
    type: 'voice.provider_failure',
    severity: 'warning',
  },
  lifecycle_violation: {
    type: 'voice.lifecycle_violation',
    severity: 'warning',
  },
};

function isSafeRef(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_REF_LENGTH &&
    SAFE_REF.test(value)
  );
}

function isSafeOptionalRef(value: unknown): value is string | undefined {
  return value === undefined || isSafeRef(value);
}

function isOptionalProviderRef(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (
      typeof value === 'string' &&
      PROVIDER_REF.test(value)
    )
  );
}

function isOptionalPhase(value: unknown): value is VoiceSessionPhase | undefined {
  return (
    value === undefined ||
    (
      typeof value === 'string' &&
      PHASES.includes(value as VoiceSessionPhase)
    )
  );
}

function isOptionalService(value: unknown): value is VoiceServiceKind | undefined {
  return value === undefined || value === 'stt' || value === 'tts';
}

function isOptionalGeneration(value: unknown): value is number | undefined {
  return (
    value === undefined ||
    (
      typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value >= 0
    )
  );
}

function isSafeOptionalReason(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (
      typeof value === 'string' &&
      value.length > 0 &&
      value.length <= MAX_REASON_LENGTH &&
      !/[\u0000-\u001F\u007F]/.test(value)
    )
  );
}

export function createVoiceAuditEvent(input: unknown): SecurityEvent | null {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'eventId',
    'kind',
    'occurredAtMs',
    'deviceRef',
    'sessionRef',
    'generation',
    'phase',
    'reason',
    'providerRef',
    'service',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.eventId !== 'string' ||
    record.eventId.trim().length === 0 ||
    record.eventId.length > MAX_REF_LENGTH ||
    typeof record.kind !== 'string' ||
    !KINDS.includes(record.kind as VoiceAuditKind) ||
    typeof record.occurredAtMs !== 'number' ||
    !Number.isFinite(record.occurredAtMs) ||
    record.occurredAtMs < 0 ||
    !isSafeOptionalRef(record.deviceRef) ||
    !isSafeOptionalRef(record.sessionRef) ||
    !isOptionalGeneration(record.generation) ||
    !isOptionalPhase(record.phase) ||
    !isSafeOptionalReason(record.reason) ||
    !isOptionalProviderRef(record.providerRef) ||
    !isOptionalService(record.service)
  ) {
    return null;
  }

  const kind = record.kind as VoiceAuditKind;
  const mapping = EVENT_MAP[kind];
  const metadata: Record<string, string | number | boolean | null> = {};

  if (record.sessionRef !== undefined) {
    metadata.sessionRef = record.sessionRef;
  }
  if (record.generation !== undefined) {
    metadata.generation = record.generation;
  }
  if (record.phase !== undefined) {
    metadata.phase = record.phase;
  }
  if (record.reason !== undefined) {
    metadata.reason = record.reason;
  }
  if (record.providerRef !== undefined) {
    metadata.providerRef = record.providerRef;
  }
  if (record.service !== undefined) {
    metadata.service = record.service;
  }

  return createSecurityEvent({
    eventId: record.eventId,
    type: mapping.type,
    severity: mapping.severity,
    occurredAtMs: record.occurredAtMs,
    deviceRef: record.deviceRef,
    metadata,
  });
}
