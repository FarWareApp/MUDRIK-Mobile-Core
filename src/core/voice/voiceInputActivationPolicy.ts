import {
  evaluateSensorActivation,
  type RuntimeAvailability,
  type SensorActivationDecisionReason,
} from '../privacy/sensorActivationPolicy';
import type { ObservationPrivacyPolicyState } from '../privacy/observationPrivacyState';
import type {
  SensorDeviceTrust,
  SensorPermissionState,
} from '../privacy/sensorStateRegistry';

export type VoiceInputActivationMode =
  | 'press_to_talk'
  | 'open_voice_session'
  | 'headset_button'
  | 'wake_word'
  | 'hands_free';

export type VoiceInputUsage =
  | 'direct_interaction'
  | 'passive_observation';

export type VoiceInputActivationReason =
  | SensorActivationDecisionReason
  | 'invalid_activation_mode';

export type VoiceInputActivationDecision = Readonly<{
  allowed: boolean;
  mode: VoiceInputActivationMode | null;
  usage: VoiceInputUsage | null;
  reason: VoiceInputActivationReason;
  changesPrivacyPolicy: false;
}>;

export type VoiceInputActivationInput = Readonly<{
  privacyState: ObservationPrivacyPolicyState;
  runtimeAvailability: RuntimeAvailability;
  permission: SensorPermissionState;
  deviceTrust: SensorDeviceTrust;
  activationMode: VoiceInputActivationMode;
  explicitUserRequest: boolean;
}>;

const ACTIVATION_MODES: readonly VoiceInputActivationMode[] = [
  'press_to_talk',
  'open_voice_session',
  'headset_button',
  'wake_word',
  'hands_free',
];

function isActivationMode(value: unknown): value is VoiceInputActivationMode {
  return (
    typeof value === 'string' &&
    ACTIVATION_MODES.includes(value as VoiceInputActivationMode)
  );
}

function usageForMode(mode: VoiceInputActivationMode): VoiceInputUsage {
  return mode === 'wake_word' || mode === 'hands_free'
    ? 'passive_observation'
    : 'direct_interaction';
}

export function evaluateVoiceInputActivation(
  input: unknown,
): VoiceInputActivationDecision {
  const denyInvalid = (): VoiceInputActivationDecision => ({
    allowed: false,
    mode: null,
    usage: null,
    reason: 'invalid_activation_mode',
    changesPrivacyPolicy: false,
  });

  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input)
  ) {
    return denyInvalid();
  }

  const record = input as Record<string, unknown>;
  const allowedKeys = new Set([
    'privacyState',
    'runtimeAvailability',
    'permission',
    'deviceTrust',
    'activationMode',
    'explicitUserRequest',
  ]);

  if (
    Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    !isActivationMode(record.activationMode)
  ) {
    return denyInvalid();
  }

  const mode = record.activationMode;
  const usage = usageForMode(mode);
  const sensorDecision = evaluateSensorActivation({
    privacyState: record.privacyState,
    runtimeAvailability: record.runtimeAvailability,
    sensorType: 'microphone',
    usage,
    permission: record.permission,
    deviceTrust: record.deviceTrust,
    explicitUserRequest: record.explicitUserRequest,
  });

  return {
    allowed: sensorDecision.allowed,
    mode,
    usage,
    reason: sensorDecision.reason,
    changesPrivacyPolicy: false,
  };
}
