import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

export type EmergencyGuardianMode =
  | 'simulation'
  | 'live';

export type EmergencyEvidenceSource =
  | 'user_report'
  | 'heart_rate'
  | 'ecg'
  | 'oxygen'
  | 'motion'
  | 'respiratory'
  | 'microphone'
  | 'camera'
  | 'responsiveness'
  | 'location';

export type EmergencyGuardianConfig = Readonly<{
  configId: string;
  accountId: string;
  revision: number;
  enabled: boolean;
  mode: EmergencyGuardianMode;
  automaticEscalation: boolean;
  responsivenessTimeoutMs: number;
  escalationCountdownMs: number;
  evidenceSources:
    readonly EmergencyEvidenceSource[];
  emergencyContactRefs: readonly string[];
  shareLocation: boolean;
  medicalProfileRef: string | null;
  shareMedicalProfile: boolean;
  updatedAtMs: number;
  simulationOnly: boolean;
  grantsAuthority: false;
}>;

const CONFIG_ID =
  /^egc_[a-z0-9][a-z0-9_-]{15,63}$/;

const CONTACT_REF =
  /^emc_[a-z0-9][a-z0-9_-]{15,63}$/;

const MEDICAL_PROFILE_REF =
  /^emp_[a-z0-9][a-z0-9_-]{15,63}$/;

const INPUT_KEYS = new Set([
  'configId',
  'accountId',
  'revision',
  'enabled',
  'mode',
  'automaticEscalation',
  'responsivenessTimeoutMs',
  'escalationCountdownMs',
  'evidenceSources',
  'emergencyContactRefs',
  'shareLocation',
  'medicalProfileRef',
  'shareMedicalProfile',
  'updatedAtMs',
]);

const MODES:
  readonly EmergencyGuardianMode[] = [
    'simulation',
    'live',
  ];

const EVIDENCE_SOURCES:
  readonly EmergencyEvidenceSource[] = [
    'user_report',
    'heart_rate',
    'ecg',
    'oxygen',
    'motion',
    'respiratory',
    'microphone',
    'camera',
    'responsiveness',
    'location',
  ];

function parseBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < minimum
    || value > maximum
  ) {
    return null;
  }

  return value;
}

function parseStringSet<T extends string>(
  value: unknown,
  allowed: readonly T[],
  maximum: number,
): readonly T[] | null {
  if (
    !Array.isArray(value)
    || value.length > maximum
  ) {
    return null;
  }

  const parsed: T[] = [];
  const seen = new Set<T>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !allowed.includes(item as T)
      || seen.has(item as T)
    ) {
      return null;
    }

    const typed = item as T;
    seen.add(typed);
    parsed.push(typed);
  }

  return Object.freeze(parsed);
}

function parseEmergencyContactRefs(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 8
  ) {
    return null;
  }

  const parsed: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !CONTACT_REF.test(item)
      || seen.has(item)
    ) {
      return null;
    }

    seen.add(item);
    parsed.push(item);
  }

  return Object.freeze(parsed);
}

function parseMedicalProfileRef(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  return (
    typeof value === 'string'
    && MEDICAL_PROFILE_REF.test(value)
  )
    ? value
    : undefined;
}

export function parseEmergencyGuardianConfig(
  input: unknown,
  trustedEvaluationTimeInput: unknown,
): EmergencyGuardianConfig | null {
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    trustedEvaluationTimeMs === null
    || typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || typeof record.configId !== 'string'
    || !CONFIG_ID.test(record.configId)
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || parseBoundedInteger(
      record.revision,
      0,
      Number.MAX_SAFE_INTEGER,
    ) === null
    || typeof record.enabled !== 'boolean'
    || typeof record.mode !== 'string'
    || !MODES.includes(
      record.mode as EmergencyGuardianMode,
    )
    || typeof record.automaticEscalation
      !== 'boolean'
    || typeof record.shareLocation !== 'boolean'
    || typeof record.shareMedicalProfile
      !== 'boolean'
  ) {
    return null;
  }

  const responsivenessTimeoutMs =
    parseBoundedInteger(
      record.responsivenessTimeoutMs,
      3_000,
      60_000,
    );
  const escalationCountdownMs =
    parseBoundedInteger(
      record.escalationCountdownMs,
      3_000,
      120_000,
    );
  const updatedAtMs =
    parseBoundedInteger(
      record.updatedAtMs,
      0,
      trustedEvaluationTimeMs,
    );
  const evidenceSources =
    parseStringSet(
      record.evidenceSources,
      EVIDENCE_SOURCES,
      EVIDENCE_SOURCES.length,
    );
  const emergencyContactRefs =
    parseEmergencyContactRefs(
      record.emergencyContactRefs,
    );
  const medicalProfileRef =
    parseMedicalProfileRef(
      record.medicalProfileRef,
    );

  if (
    responsivenessTimeoutMs === null
    || escalationCountdownMs === null
    || updatedAtMs === null
    || !evidenceSources
    || !emergencyContactRefs
    || medicalProfileRef === undefined
    || (
      record.shareMedicalProfile
      && medicalProfileRef === null
    )
  ) {
    return null;
  }

  const mode =
    record.mode as EmergencyGuardianMode;

  return Object.freeze({
    configId: record.configId,
    accountId: record.accountId,
    revision: record.revision as number,
    enabled: record.enabled,
    mode,
    automaticEscalation:
      record.automaticEscalation,
    responsivenessTimeoutMs,
    escalationCountdownMs,
    evidenceSources,
    emergencyContactRefs,
    shareLocation:
      record.shareLocation,
    medicalProfileRef,
    shareMedicalProfile:
      record.shareMedicalProfile,
    updatedAtMs,
    simulationOnly:
      mode === 'simulation',
    grantsAuthority: false,
  });
}
