export type SecretReference = `secret://${string}/${string}`;

const SECRET_REFERENCE_PATTERN = /^secret:\/\/[a-z][a-z0-9-]{0,62}\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isSecretReference(value: unknown): value is SecretReference {
  return typeof value === 'string' && SECRET_REFERENCE_PATTERN.test(value);
}

export function assertSecretReference(value: unknown): SecretReference {
  if (!isSecretReference(value)) {
    throw new Error('Expected a scoped secret reference, not plaintext secret material');
  }

  return value;
}
