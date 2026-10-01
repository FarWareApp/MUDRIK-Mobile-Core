import {
  containsSecretShape,
  exactObject,
} from './intelligenceSecurity';

import {
  type IntelligenceFailureCode,
} from './intelligenceFailover';

export type IntelligenceProviderFailure =
  Readonly<{
    code: IntelligenceFailureCode;
    retryable: boolean;
    providerSafeMessage: string | null;
  }>;

const CODES =
  new Set<IntelligenceFailureCode>([
    'network_unavailable',
    'provider_unavailable',
    'timeout',
    'rate_limited',
    'invalid_response',
    'unsupported_input',
    'permission_denied',
    'cancelled',
    'policy_denied',
    'unknown',
  ]);

const KEYS =
  new Set([
    'code',
    'retryable',
    'providerSafeMessage',
  ]);

const NON_RETRYABLE =
  new Set<IntelligenceFailureCode>([
    'unsupported_input',
    'permission_denied',
    'cancelled',
    'policy_denied',
  ]);

const FALLBACK:
  IntelligenceProviderFailure =
    Object.freeze({
      code: 'unknown',
      retryable: false,
      providerSafeMessage: null,
    });

export function normalizeIntelligenceProviderFailure(
  input: unknown,
): IntelligenceProviderFailure {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || typeof record.code !== 'string'
    || !CODES.has(
      record.code as
        IntelligenceFailureCode,
    )
    || typeof record.retryable
      !== 'boolean'
    || (
      record.providerSafeMessage !== null
      && typeof record.providerSafeMessage
        !== 'string'
    )
  ) {
    return FALLBACK;
  }

  const code =
    record.code as
      IntelligenceFailureCode;
  const retryable =
    NON_RETRYABLE.has(code)
      ? false
      : record.retryable as boolean;
  const raw =
    record.providerSafeMessage;

  const providerSafeMessage =
    typeof raw === 'string'
    && raw.length <= 240
    && !containsSecretShape(raw)
    && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
      .test(raw)
      ? raw
      : null;

  return Object.freeze({
    code,
    retryable,
    providerSafeMessage,
  });
}
