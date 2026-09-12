export type SecureStorageClass =
  | 'device_private_key'
  | 'session_refresh_credential'
  | 'recovery_secret'
  | 'integration_credential'
  | 'local_encryption_key';

export type SecureStorageKey = `${SecureStorageClass}:${string}`;

export type SecureStorageOptions = {
  requireUserPresence?: boolean;
  hardwareBackedPreferred?: boolean;
  invalidateOnBiometricChange?: boolean;
};

export interface SecureStoragePort {
  read(key: SecureStorageKey): Promise<string | null>;
  write(
    key: SecureStorageKey,
    value: string,
    options?: SecureStorageOptions,
  ): Promise<void>;
  remove(key: SecureStorageKey): Promise<void>;
}

const KEY_PATTERN = /^(device_private_key|session_refresh_credential|recovery_secret|integration_credential|local_encryption_key):[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isSecureStorageKey(value: unknown): value is SecureStorageKey {
  return typeof value === 'string' && KEY_PATTERN.test(value);
}

export function assertSecureStorageKey(value: unknown): SecureStorageKey {
  if (!isSecureStorageKey(value)) {
    throw new Error('Invalid secure storage key');
  }

  return value;
}
