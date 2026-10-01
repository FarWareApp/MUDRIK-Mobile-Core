import {
  CREDENTIAL_REF,
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PROVIDER_REF,
  LANGUAGE_TAG,
  exactObject,
  freezeStrings,
  safeInteger,
} from './intelligenceSecurity';

export const INTELLIGENCE_SERVICE_KINDS =
  Object.freeze([
    'general',
    'coding',
    'vision',
    'stt',
    'tts',
  ] as const);

export type IntelligenceServiceKind =
  typeof INTELLIGENCE_SERVICE_KINDS[number];

export type IntelligenceExecutionMode =
  | 'offline'
  | 'online';

export type IntelligenceProviderStatus =
  | 'ready'
  | 'degraded'
  | 'unavailable';

export type IntelligenceProviderRegistration =
  Readonly<{
    protocolVersion: '1.0';
    providerRef: string;
    modelRef: string;
    service: IntelligenceServiceKind;
    executionMode: IntelligenceExecutionMode;
    supportsStreaming: boolean;
    languageTags: readonly string[];
    qualityScore: number;
    expectedFirstResultMs: number | null;
    expectedCostMicrosPer1kUnits:
      number | null;
    maxInputBytes: number;
    credentialRef: string | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type PublicIntelligenceProvider =
  Omit<
    IntelligenceProviderRegistration,
    'credentialRef'
  >;

const SERVICES =
  new Set<IntelligenceServiceKind>(
    INTELLIGENCE_SERVICE_KINDS,
  );
const MODES =
  new Set<IntelligenceExecutionMode>([
    'offline',
    'online',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'providerRef',
    'modelRef',
    'service',
    'executionMode',
    'supportsStreaming',
    'languageTags',
    'qualityScore',
    'expectedFirstResultMs',
    'expectedCostMicrosPer1kUnits',
    'maxInputBytes',
    'credentialRef',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseLanguageTags(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 32
  ) {
    return null;
  }
  const output: string[] = [];
  const seen =
    new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !LANGUAGE_TAG.test(item)
    ) {
      return null;
    }

    const normalized =
      item.toLowerCase();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      output.push(normalized);
    }
  }

  return freezeStrings(output);
}

export function parseIntelligenceProviderRegistration(
  input: unknown,
): IntelligenceProviderRegistration | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.providerRef !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.providerRef,
    )
    || typeof record.modelRef !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(
      record.modelRef,
    )
    || typeof record.service !== 'string'
    || !SERVICES.has(
      record.service as IntelligenceServiceKind,
    )
    || typeof record.executionMode !== 'string'
    || !MODES.has(
      record.executionMode as
        IntelligenceExecutionMode,
    )
    || typeof record.supportsStreaming
      !== 'boolean'
    || !safeInteger(record.qualityScore)
    || (record.qualityScore as number) > 1000
    || (
      record.expectedFirstResultMs !== null
      && (
        !safeInteger(
          record.expectedFirstResultMs,
        )
        || (record.expectedFirstResultMs as number)
          > 3_600_000
      )
    )
    || (
      record.expectedCostMicrosPer1kUnits
        !== null
      && (
        !safeInteger(
          record.expectedCostMicrosPer1kUnits,
        )
        || Number(
          record.expectedCostMicrosPer1kUnits,
        ) > 1_000_000_000_000
      )
    )
    || !safeInteger(record.maxInputBytes)
    || (record.maxInputBytes as number) < 1
    || (record.maxInputBytes as number)
      > 16 * 1024 * 1024
    || record.grantsExecutionAuthority
      !== false
    || record.grantsSensorAuthority
      !== false
    || record.grantsApprovalAuthority
      !== false
    || record.grantsCapabilityAuthority
      !== false
  ) {
    return null;
  }

  const languageTags =
    parseLanguageTags(record.languageTags);

  if (!languageTags) {
    return null;
  }
  const executionMode =
    record.executionMode as
      IntelligenceExecutionMode;
  const credentialRef =
    record.credentialRef;

  if (
    executionMode === 'online'
    ? (
        typeof credentialRef !== 'string'
        || !CREDENTIAL_REF.test(
          credentialRef,
        )
      )
    : credentialRef !== null
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    providerRef:
      record.providerRef as string,
    modelRef:
      record.modelRef as string,
    service:
      record.service as IntelligenceServiceKind,
    executionMode,
    supportsStreaming:
      record.supportsStreaming as boolean,
    languageTags,
    qualityScore:
      record.qualityScore as number,
    expectedFirstResultMs:
      record.expectedFirstResultMs as
        number | null,
    expectedCostMicrosPer1kUnits:
      record.expectedCostMicrosPer1kUnits as
        number | null,
    maxInputBytes:
      record.maxInputBytes as number,
    credentialRef:
      credentialRef as string | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function toPublicIntelligenceProvider(
  registration:
    IntelligenceProviderRegistration,
): PublicIntelligenceProvider {
  const {
    credentialRef: _credentialRef,
    ...publicValue
  } = registration;

  return Object.freeze({
    ...publicValue,
    languageTags:
      freezeStrings(
        publicValue.languageTags,
      ),
  });
}
