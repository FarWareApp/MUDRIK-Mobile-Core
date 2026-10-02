const SECRET_VALUE =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}\b|\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\b(?:password|passwd|token|api[_-]?key|secret)\s*[:=]\s*[^\s,;]{4,})/i;

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

export const BRAIN_REQUEST_ID =
  new RegExp('^brain_request_' + BODY + '$');

export const BRAIN_EVENT_ID =
  new RegExp('^brain_event_' + BODY + '$');

export const BRAIN_SESSION_ID =
  new RegExp('^brain_session_' + BODY + '$');

export const BRAIN_TRACE_ID =
  new RegExp('^brain_trace_' + BODY + '$');

export const BRAIN_PAYLOAD_REF =
  /^payload_ref_[A-Za-z0-9][A-Za-z0-9._:@/+\-]{15,223}$/;

export const BRAIN_ATTACHMENT_REF =
  /^attachment_ref_[A-Za-z0-9][A-Za-z0-9._:@/+\-]{15,223}$/;

export const LANGUAGE_TAG =
  /^(?:mul|[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3})$/;

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype
    || prototype === null
  );
}

export function exactObject(
  value: unknown,
  keys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const actual = Object.keys(value);

  if (
    actual.length !== keys.size
    || actual.some((key) => !keys.has(key))
  ) {
    return null;
  }

  return value;
}

export function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && Number(value) >= 0
  );
}

export function safeReference(
  value: unknown,
  maxLength = 240,
): value is string {
  return (
    typeof value === 'string'
    && value.length >= 3
    && value.length <= maxLength
    && /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]*$/
      .test(value)
    && !SECRET_VALUE.test(value)
  );
}

export function safeReasonCode(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && /^[a-z][a-z0-9_-]{0,95}$/.test(value)
  );
}

export function containsSecretShape(
  value: unknown,
): boolean {
  return (
    typeof value === 'string'
    && SECRET_VALUE.test(value)
  );
}

export function freezeStrings(
  values: readonly string[],
): readonly string[] {
  return Object.freeze([...values]);
}
