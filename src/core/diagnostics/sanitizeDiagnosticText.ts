const EMAIL =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const BEARER_TOKEN =
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;

const PROVIDER_SECRET =
  /\b(?:sk-|AIza)[A-Za-z0-9._-]{8,}/g;

const GITHUB_TOKEN =
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g;

const GITHUB_FINE_GRAINED_TOKEN =
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g;

const AWS_ACCESS_KEY_ID =
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;

const SLACK_TOKEN =
  /\bxox(?:a|b|p|r|s)-[A-Za-z0-9-]{10,}\b/g;

const JWT =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;

const PRIVATE_KEY_HEADER =
  /-----BEGIN\s+(?:(?:RSA|EC|OPENSSH)\s+)?PRIVATE KEY-----/g;

const CREDENTIAL_ASSIGNMENT =
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[^\s,"']{8,}/gi;

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
      PROVIDER_SECRET,
      '[redacted-secret]',
    )
    .replace(
      GITHUB_TOKEN,
      '[redacted-secret]',
    )
    .replace(
      GITHUB_FINE_GRAINED_TOKEN,
      '[redacted-secret]',
    )
    .replace(
      AWS_ACCESS_KEY_ID,
      '[redacted-secret]',
    )
    .replace(
      SLACK_TOKEN,
      '[redacted-secret]',
    )
    .replace(
      JWT,
      '[redacted-token]',
    )
    .replace(
      PRIVATE_KEY_HEADER,
      '[redacted-private-key]',
    )
    .replace(
      CREDENTIAL_ASSIGNMENT,
      '[redacted-credential]',
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
