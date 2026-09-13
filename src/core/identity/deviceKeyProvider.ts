import type { DeviceTrustState } from './deviceTrust';

export type DeviceKeyMetadata = Readonly<{
  keyId: string;
  publicKeySpkiBase64Url: string;
  publicKeyThumbprint: string;
  hardwareBacked: boolean;
  createdAtMs: number;
}>;

export type DeviceKeyStatus = Readonly<{
  state: DeviceTrustState;
  keyId: string;
  hardwareBacked: boolean;
}>;

export interface DeviceKeyProvider {
  createDeviceSigningKey(label: string): Promise<DeviceKeyMetadata>;
  getDeviceKeyMetadata(): Promise<DeviceKeyMetadata | null>;
  signChallenge(challenge: Uint8Array): Promise<Uint8Array>;
  rotateDeviceSigningKey(label: string): Promise<DeviceKeyMetadata>;
  deleteDeviceSigningKey(): Promise<void>;
  getDeviceKeyStatus(): Promise<DeviceKeyStatus | null>;
}

// Intentionally absent from this contract:
// - exportPrivateKey
// - getPrivateKey
// - serializePrivateKey
//
// Platform adapters may use hardware-backed or OS-protected key stores, but
// MUDRIK callers receive only public metadata and signing operations.
