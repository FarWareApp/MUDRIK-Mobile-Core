import {
  ACCOUNT_ID,
  INTELLIGENCE_POLICY_ID,
  INTELLIGENCE_REQUEST_ID,
  LANGUAGE_TAG,
  WORKSPACE_ID,
  exactObject,
  freezeStrings,
  safeInteger,
} from './intelligenceSecurity';

import {
  type IntelligenceServiceKind,
} from './intelligenceProvider';

export type IntelligenceOptimization =
  | 'balanced'
  | 'quality'
  | 'latency'
  | 'cost'
  | 'offline';

export type IntelligenceRouteRequest =
  Readonly<{
    protocolVersion: '1.0';
    requestId: string;
    accountId: string;
    policyId: string;
    policyRevision: number;
    workspaceId: string;
    service: IntelligenceServiceKind;
    languageHints: readonly string[];
    requireStreaming: boolean;
    inputBytes: number;
    networkAvailable: boolean;
    allowOnline: boolean;
    optimization: IntelligenceOptimization;
    maxLatencyMs: number | null;
    maxCostMicrosPer1kUnits:
      number | null;
    minQualityScore: number;
    maxFallbacks: number;
    maxHealthAgeMs: number;
    requestedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const SERVICES =
  new Set<IntelligenceServiceKind>([
    'general',
    'coding',
    'vision',
    'stt',
    'tts',
  ]);

const OPTIMIZATIONS =
  new Set<IntelligenceOptimization>([
    'balanced',
    'quality',
    'latency',
    'cost',
    'offline',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'requestId',
    'accountId',
    'policyId',
    'policyRevision',
    'workspaceId',
    'service',
    'languageHints',
    'requireStreaming',
    'inputBytes',
    'networkAvailable',
    'allowOnline',
    'optimization',
    'maxLatencyMs',
    'maxCostMicrosPer1kUnits',
    'minQualityScore',
    'maxFallbacks',
    'maxHealthAgeMs',
    'requestedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseLanguages(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 8
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
export function parseIntelligenceRouteRequest(
  input: unknown,
): IntelligenceRouteRequest | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.requestId !== 'string'
    || !INTELLIGENCE_REQUEST_ID.test(
      record.requestId,
    )
    || typeof record.accountId !== 'string'
    || !ACCOUNT_ID.test(record.accountId)
    || typeof record.policyId !== 'string'
    || !INTELLIGENCE_POLICY_ID.test(
      record.policyId,
    )
    || !safeInteger(record.policyRevision)
    || Number(record.policyRevision) < 1
    || typeof record.workspaceId !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || typeof record.service !== 'string'
    || !SERVICES.has(
      record.service as IntelligenceServiceKind,
    )
    || typeof record.requireStreaming
      !== 'boolean'
    || !safeInteger(record.inputBytes)
    || (record.inputBytes as number) < 1
    || (record.inputBytes as number)
      > 16 * 1024 * 1024
    || typeof record.networkAvailable
      !== 'boolean'
    || typeof record.allowOnline
      !== 'boolean'
    || typeof record.optimization
      !== 'string'
    || !OPTIMIZATIONS.has(
      record.optimization as
        IntelligenceOptimization,
    )
    || (
      record.maxLatencyMs !== null
      && (
        !safeInteger(record.maxLatencyMs)
        || (record.maxLatencyMs as number)
          > 3_600_000
      )
    )
    || (
      record.maxCostMicrosPer1kUnits
        !== null
      && (
        !safeInteger(
          record.maxCostMicrosPer1kUnits,
        )
        || Number(
          record.maxCostMicrosPer1kUnits,
        ) > 1_000_000_000_000
      )
    )
    || !safeInteger(record.minQualityScore)
    || (record.minQualityScore as number)
      > 1000
    || !safeInteger(record.maxFallbacks)
    || (record.maxFallbacks as number) > 7
    || !safeInteger(record.maxHealthAgeMs)
    || (record.maxHealthAgeMs as number)
      < 1_000
    || (record.maxHealthAgeMs as number)
      > 24 * 60 * 60 * 1000
    || !safeInteger(record.requestedAtMs)
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

  const languageHints =
    parseLanguages(record.languageHints);

  if (!languageHints) {
    return null;
  }
  return Object.freeze({
    protocolVersion: '1.0',
    requestId:
      record.requestId as string,
    accountId:
      record.accountId as string,
    policyId:
      record.policyId as string,
    policyRevision:
      record.policyRevision as number,
    workspaceId:
      record.workspaceId as string,
    service:
      record.service as IntelligenceServiceKind,
    languageHints,
    requireStreaming:
      record.requireStreaming as boolean,
    inputBytes:
      record.inputBytes as number,
    networkAvailable:
      record.networkAvailable as boolean,
    allowOnline:
      record.allowOnline as boolean,
    optimization:
      record.optimization as
        IntelligenceOptimization,
    maxLatencyMs:
      record.maxLatencyMs as number | null,
    maxCostMicrosPer1kUnits:
      record.maxCostMicrosPer1kUnits as
        number | null,
    minQualityScore:
      record.minQualityScore as number,
    maxFallbacks:
      record.maxFallbacks as number,
    maxHealthAgeMs:
      record.maxHealthAgeMs as number,
    requestedAtMs:
      record.requestedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
