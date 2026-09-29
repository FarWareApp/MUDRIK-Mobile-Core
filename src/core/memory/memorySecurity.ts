const SECRET_VALUE =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}\b|\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bAIza[A-Za-z0-9_-]{20,}\b|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\b(?:password|passwd|token|api[_-]?key|secret)\s*[:=]\s*[^\s,;]{4,}|\bsecret_ref_[A-Za-z0-9_-]{16,240}\b)/i;

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

export const MEMORY_ID =
  new RegExp(
    '^memory_item_' + BODY + '$',
  );

export const MEMORY_POLICY_ID =
  new RegExp(
    '^memory_policy_' + BODY + '$',
  );

export const MEMORY_CANDIDATE_ID =
  new RegExp(
    '^memory_candidate_' + BODY + '$',
  );

export const MEMORY_APPROVAL_ID =
  new RegExp(
    '^memory_approval_' + BODY + '$',
  );

export const ACCOUNT_ID =
  new RegExp(
    '^acct_' + BODY + '$',
  );

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

  if (
    Object.keys(value).length
      !== keys.size
    || Object.keys(value).some(
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

export function isSafeMemoryText(
  value: unknown,
  maxLength: number,
): value is string {
  return (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= maxLength
    && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
      .test(value)
    && !SECRET_VALUE.test(value)
  );
}

export function isSafeReference(
  value: unknown,
  maxLength = 180,
): value is string {
  return (
    typeof value === 'string'
    && value.length >= 8
    && value.length <= maxLength
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/
      .test(value)
    && !SECRET_VALUE.test(value)
  );
}

export function freezeStrings(
  values: readonly string[],
): readonly string[] {
  return Object.freeze([
    ...values,
  ]);
}
