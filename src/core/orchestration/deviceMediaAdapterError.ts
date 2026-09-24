import {
  sanitizeSecurityMetadata,
} from '../security/securityEvent';

export type DeviceMediaAdapterErrorCode =
  | 'unavailable'
  | 'timeout'
  | 'unsupported'
  | 'authorization_denied'
  | 'rate_limited'
  | 'invalid_response'
  | 'unknown';

export type DeviceMediaAdapterError = Readonly<{
  code: DeviceMediaAdapterErrorCode;
  safeDetail: string | null;
  retryable: boolean;
}>;

const CODES:
  readonly DeviceMediaAdapterErrorCode[] = [
    'unavailable',
    'timeout',
    'unsupported',
    'authorization_denied',
    'rate_limited',
    'invalid_response',
    'unknown',
  ];

function retryable(
  code: DeviceMediaAdapterErrorCode,
): boolean {
  return (
    code === 'unavailable'
    || code === 'timeout'
    || code === 'rate_limited'
  );
}

function sanitizedDetail(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const sanitized =
    sanitizeSecurityMetadata({
      detail: value,
    }).detail;

  return typeof sanitized === 'string'
    ? sanitized
    : null;
}

export function normalizeDeviceMediaAdapterError(
  input: unknown,
): DeviceMediaAdapterError {
  let code:
    DeviceMediaAdapterErrorCode =
      'unknown';
  let detail: string | null = null;

  if (typeof input === 'string') {
    detail =
      sanitizedDetail(input);
  } else if (
    typeof input === 'object'
    && input !== null
    && !Array.isArray(input)
  ) {
    const record =
      input as Record<string, unknown>;

    if (
      typeof record.code === 'string'
      && CODES.includes(
        record.code as DeviceMediaAdapterErrorCode,
      )
    ) {
      code =
        record.code as DeviceMediaAdapterErrorCode;
    }

    detail =
      sanitizedDetail(
        record.message,
      );
  }

  return Object.freeze({
    code,
    safeDetail: detail,
    retryable:
      retryable(code),
  });
}
