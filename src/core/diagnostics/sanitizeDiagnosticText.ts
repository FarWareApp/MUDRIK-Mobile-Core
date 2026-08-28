const EMAIL =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const BEARER_TOKEN =
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;

const SECRET_TOKEN =
  /\b(?:sk-|AIza)[A-Za-z0-9._-]+/g;

const LOCAL_PATH =
  /(?:file:\/\/\/|\/home\/|\/Users\/)[^\s]+/g;

const URL_DETAILS =
  /(https?:\/\/[^\s?#]+)[?#][^\s]+/gi;

const MAX_LENGTH = 500;

export function sanitizeDiagnosticText(
  value: string,
): string {
  return value
    .replace(
      EMAIL,
      '[redacted-email]',
    )
    .replace(
      BEARER_TOKEN,
      '[redacted-token]',
    )
    .replace(
      SECRET_TOKEN,
      '[redacted-secret]',
    )
    .replace(
      LOCAL_PATH,
      '[redacted-path]',
    )
    .replace(
      URL_DETAILS,
      '$1[redacted]',
    )
    .slice(
      0,
      MAX_LENGTH,
    );
}
