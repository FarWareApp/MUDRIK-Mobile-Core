export const SECURITY_EVENT_TYPES = [
  'authorization.allowed',
  'authorization.denied',
  'authentication.succeeded',
  'authentication.failed',
  'authentication.step_up_required',
  'capability.granted',
  'capability.revoked',
  'session.revoked',
  'session.suspected_reuse',
  'device.paired',
  'device.pairing_rejected',
  'device.key_rotated',
  'device.revoked',
  'recovery.requested',
  'recovery.completed',
  'recovery.denied',
  'privacy.state_changed',
  'replay.rejected',
  'signature.invalid',
  'secret.accessed',
  'update.verification_failed',
  'security.kill_switch',
] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export type SecurityEventSeverity = 'info' | 'warning' | 'high' | 'critical';

export type SecurityEvent = {
  eventId: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  occurredAtMs: number;
  actorRef?: string;
  deviceRef?: string;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
};

const SENSITIVE_KEY = /(?:authorization|bearer|cookie|password|passwd|secret|token|refresh[_-]?token|jwt|api[_-]?key|private[_-]?key|credential|session[_-]?key|assertion|recovery[_-]?(?:code|key|secret)|challenge[_-]?nonce)/i;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g;
const COMMON_API_KEY = /\b(?:sk-|ghp_|github_pat_|AIza|gsk_)[A-Za-z0-9_-]{12,}\b/g;
const MAX_STRING_LENGTH = 256;

function sanitizeString(value: string): string {
  const redacted = value
    .replace(BEARER_TOKEN, '[REDACTED_BEARER]')
    .replace(JWT, '[REDACTED_JWT]')
    .replace(COMMON_API_KEY, '[REDACTED_SECRET]');

  if (redacted.length <= MAX_STRING_LENGTH) {
    return redacted;
  }

  return `${redacted.slice(0, MAX_STRING_LENGTH)}…`;
}

export function sanitizeSecurityMetadata(
  metadata: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string | number | boolean | null>> {
  const output: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) {
      output[key] = '[REDACTED]';
      continue;
    }

    if (value === null) {
      output[key] = null;
      continue;
    }

    if (typeof value === 'string') {
      output[key] = sanitizeString(value);
      continue;
    }

    if (typeof value === 'number') {
      output[key] = Number.isFinite(value) ? value : '[REDACTED_NON_FINITE]';
      continue;
    }

    if (typeof value === 'boolean') {
      output[key] = value;
      continue;
    }

    output[key] = '[REDACTED_NON_SCALAR]';
  }

  return Object.freeze(output);
}

export function createSecurityEvent(input: {
  eventId: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  occurredAtMs: number;
  actorRef?: string;
  deviceRef?: string;
  metadata?: Readonly<Record<string, unknown>>;
}): SecurityEvent {
  if (input.eventId.trim().length === 0 || !Number.isFinite(input.occurredAtMs)) {
    throw new Error('Invalid security event identity or timestamp');
  }

  return Object.freeze({
    eventId: input.eventId,
    type: input.type,
    severity: input.severity,
    occurredAtMs: input.occurredAtMs,
    actorRef: input.actorRef,
    deviceRef: input.deviceRef,
    metadata: sanitizeSecurityMetadata(input.metadata ?? {}),
  });
}
