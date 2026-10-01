const SECRET_VALUE =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}\b|\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bAIza[A-Za-z0-9_-]{20,}\b|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\b(?:password|passwd|token|api[_-]?key|secret)\s*[:=]\s*[^\s,;]{4,})/i;

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

export const INTELLIGENCE_POLICY_ID =
  new RegExp(
    '^intelligence_policy_' + BODY + '$',
  );

export const INTELLIGENCE_PROVIDER_REF =
  new RegExp('^provider_' + BODY + '$');

export const INTELLIGENCE_MODEL_REF =
  new RegExp('^model_' + BODY + '$');

export const INTELLIGENCE_REQUEST_ID =
  new RegExp(
    '^intelligence_request_' + BODY + '$',
  );

export const INTELLIGENCE_PLAN_ID =
  new RegExp(
    '^intelligence_plan_' + BODY + '$',
  );
export const INTELLIGENCE_EVENT_ID =
  new RegExp(
    '^intelligence_event_' + BODY + '$',
  );

export const ACCOUNT_ID =
  new RegExp('^acct_' + BODY + '$');

export const WORKSPACE_ID =
  new RegExp('^workspace_' + BODY + '$');

export const CREDENTIAL_REF =
  /^credential_ref_[A-Za-z0-9][A-Za-z0-9._:@/+\-]{15,159}$/;

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

  const actual =
    Object.keys(value);

  if (
    actual.length !== keys.size
    || actual.some(
      (key) => !keys.has(key),
    )
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
    && (value as number) >= 0
  );
}

export function isSafePublicReference(
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
