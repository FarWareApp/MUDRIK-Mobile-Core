const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const SECRET_VALUE =
  /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\b(?:password|passwd|token|api[_-]?key|secret)\s*[:=]\s*[^\s,;]{4,})/i;

export const INTEGRATION_POLICY_ID =
  new RegExp('^integration_policy_' + BODY + '$');
export const INTEGRATION_ID =
  new RegExp('^integration_' + BODY + '$');
export const INTEGRATION_ADAPTER_ID =
  new RegExp('^iadapter_' + BODY + '$');
export const INTEGRATION_DISCOVERY_ID =
  new RegExp('^idiscovery_' + BODY + '$');
export const INTEGRATION_DEVICE_ID =
  new RegExp('^idevice_' + BODY + '$');
export const INTEGRATION_BINDING_ID =
  new RegExp('^ibinding_' + BODY + '$');
export const INTEGRATION_COMMAND_ID =
  new RegExp('^icommand_' + BODY + '$');
export const INTEGRATION_APPROVAL_ID =
  new RegExp('^iapproval_' + BODY + '$');
export const INTEGRATION_ROUTINE_ID =
  new RegExp('^iroutine_' + BODY + '$');
export const INTEGRATION_AUTOMATION_ID =
  new RegExp('^iautomation_' + BODY + '$');
export const INTEGRATION_EVENT_ID =
  new RegExp('^ievent_' + BODY + '$');
export const INTEGRATION_TRIGGER_EVENT_ID =
  new RegExp('^itrigger_' + BODY + '$');
export const INTEGRATION_AUTOMATION_EXECUTION_ID =
  new RegExp('^iautoexec_' + BODY + '$');

export const ACCOUNT_ID =
  new RegExp('^acct_' + BODY + '$');
export const WORKSPACE_ID =
  new RegExp('^workspace_' + BODY + '$');

export const CREDENTIAL_REF =
  /^credential_ref_[A-Za-z0-9][A-Za-z0-9._:@/+\-]{15,159}$/;

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
    && Number(value) >= 0
  );
}

export function safeReference(
  value: unknown,
  maxLength = 240,
): value is string {
  return (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= maxLength
    && /^[A-Za-z0-9][A-Za-z0-9._:@/+\-]*$/
      .test(value)
    && !SECRET_VALUE.test(value)
  );
}

export function safeLabel(
  value: unknown,
  maxLength = 80,
): value is string {
  return (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= maxLength
    && !/[\u0000-\u001F\u007F]/.test(value)
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
