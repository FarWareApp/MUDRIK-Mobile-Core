const STRONG_SECRET_SIGNATURE =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{20,}\b|\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bAIza[A-Za-z0-9_-]{20,}\b|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\bsecret_ref_[A-Za-z0-9_-]{16,240}\b|secret:\/\/[a-z][a-z0-9-]{0,62}\/[A-Za-z0-9][A-Za-z0-9._-]{0,127})/i;

const UNSAFE_CONTROL =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function containsStrongSurfaceSecret(
  value: string,
): boolean {
  return STRONG_SECRET_SIGNATURE.test(
    value,
  );
}

export function isSafeSurfaceText(
  value: unknown,
  maxLength: number,
): value is string {
  return (
    typeof value === 'string'
    && value.length <= maxLength
    && !UNSAFE_CONTROL.test(value)
    && !containsStrongSurfaceSecret(
      value,
    )
  );
}
