export type IdentityIdKind =
  | 'account'
  | 'device'
  | 'session'
  | 'refresh_family'
  | 'device_key'
  | 'pairing_challenge';

const PREFIX: Readonly<Record<IdentityIdKind, string>> = {
  account: 'acct_',
  device: 'dev_',
  session: 'sess_',
  refresh_family: 'rfm_',
  device_key: 'dkey_',
  pairing_challenge: 'pair_',
};

const BODY_PATTERN = /^[a-z0-9][a-z0-9_-]{15,63}$/;

export function isIdentityId(
  kind: IdentityIdKind,
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const prefix = PREFIX[kind];
  if (!value.startsWith(prefix)) {
    return false;
  }

  const body = value.slice(prefix.length);
  return BODY_PATTERN.test(body);
}

export function assertIdentityId(
  kind: IdentityIdKind,
  value: unknown,
): string {
  if (!isIdentityId(kind, value)) {
    throw new Error(`Invalid ${kind} identifier`);
  }

  return value;
}

export function isPublicKeyThumbprint(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === 43 &&
    /^[A-Za-z0-9_-]{43}$/.test(value)
  );
}
