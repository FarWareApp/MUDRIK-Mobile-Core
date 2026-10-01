const SECRET_VALUE =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}\b|\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bAIza[A-Za-z0-9_-]{20,}\b|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\b(?:password|passwd|token|api[_-]?key|secret)\s*[:=]\s*[^\s,;]{4,}|\bsecret_ref_[A-Za-z0-9_-]{16,240}\b)/i;

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

export const KNOWLEDGE_POLICY_ID =
  new RegExp(
    '^knowledge_policy_' + BODY + '$',
  );

export const KNOWLEDGE_SOURCE_ID =
  new RegExp(
    '^knowledge_source_' + BODY + '$',
  );

export const KNOWLEDGE_QUERY_ID =
  new RegExp(
    '^knowledge_query_' + BODY + '$',
  );

export const KNOWLEDGE_PROJECTION_ID =
  new RegExp(
    '^knowledge_projection_' + BODY + '$',
  );

export const KNOWLEDGE_CHUNK_ID =
  /^knowledge_chunk_[a-f0-9]{64}$/;

export const ACCOUNT_ID =
  new RegExp(
    '^acct_' + BODY + '$',
  );

export const WORKSPACE_ID =
  new RegExp(
    '^workspace_' + BODY + '$',
  );

export const SHA256 =
  /^[a-f0-9]{64}$/;

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

export function isSafeKnowledgeText(
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

export function normalizeKnowledgeText(
  value: string,
): string {
  return value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(
      (line) =>
        line.replace(/[ \t]+$/g, ''),
    )
    .join('\n')
    .trim();
}

export function utf8ByteLength(
  value: string,
): number {
  let bytes = 0;

  for (
    let index = 0;
    index < value.length;
  ) {
    const codePoint =
      value.codePointAt(index);

    if (codePoint === undefined) {
      break;
    }

    bytes +=
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4;

    index +=
      codePoint > 0xffff
        ? 2
        : 1;
  }

  return bytes;
}

export function safeHttpsLocator(
  value: unknown,
): {
  canonical: string;
  domain: string;
} | null {
  if (
    typeof value !== 'string'
    || value.length < 8
    || value.length > 2048
    || SECRET_VALUE.test(value)
  ) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.username
    || parsed.password
    || parsed.hash
    || (
      parsed.port
      && parsed.port !== '443'
    )
    || !parsed.hostname
    || parsed.hostname.length > 253
  ) {
    return null;
  }

  parsed.hostname =
    parsed.hostname.toLowerCase();

  return {
    canonical:
      parsed.toString(),
    domain:
      parsed.hostname,
  };
}

export function safeProjectLocator(
  value: unknown,
): string | null {
  if (
    typeof value !== 'string'
    || value.length < 8
    || value.length > 2048
    || !/^(?:project|repo):[A-Za-z0-9][A-Za-z0-9._:/+\-]*$/
      .test(value)
    || /(?:^|\/)\.\.(?:\/|$)/
      .test(value)
    || SECRET_VALUE.test(value)
  ) {
    return null;
  }

  return value;
}

export function freezeStrings(
  values: readonly string[],
): readonly string[] {
  return Object.freeze([
    ...values,
  ]);
}
