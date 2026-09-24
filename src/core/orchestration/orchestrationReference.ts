export type OrchestrationReferencePrefix =
  | 'app'
  | 'media'
  | 'content'
  | 'game'
  | 'channel'
  | 'room'
  | 'scene'
  | 'category'
  | 'routine'
  | 'preset';

const OPAQUE_REFERENCE =
  /^[a-z][a-z0-9_-]{1,23}_[a-z0-9][a-z0-9._:-]{1,95}$/;

const CREDENTIAL_SHAPE =
  /(?:^|[._:-])(?:sk|api[_-]?key|bearer|token|secret|ghp|github[_-]?pat|aiza)(?:[._:-]|$)/i;

const EXECUTABLE_OR_URL_SHAPE =
  /(?:^[a-z][a-z0-9+.-]*:|\/\/|\b(?:bash|zsh|sh)\s+-c\b|\b(?:powershell|pwsh)\b|\bcmd(?:\.exe)?\s+\/c\b|&&|\|\||`|\$\()/i;

export function hasCredentialOrExecutableShape(
  value: string,
): boolean {
  return (
    CREDENTIAL_SHAPE.test(value)
    || EXECUTABLE_OR_URL_SHAPE.test(value)
  );
}

export function parseOpaqueOrchestrationReference(
  value: unknown,
  prefix: OrchestrationReferencePrefix,
): string | null {
  if (
    typeof value !== 'string'
    || value.length > 120
    || !value.startsWith(`${prefix}_`)
    || !OPAQUE_REFERENCE.test(value)
    || hasCredentialOrExecutableShape(value)
  ) {
    return null;
  }

  return value;
}
