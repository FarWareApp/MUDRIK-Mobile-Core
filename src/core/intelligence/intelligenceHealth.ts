import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PROVIDER_REF,
  exactObject,
  safeInteger,
} from './intelligenceSecurity';

import {
  type IntelligenceProviderStatus,
} from './intelligenceProvider';

export type IntelligenceProviderHealth =
  Readonly<{
    protocolVersion: '1.0';
    providerRef: string;
    modelRef: string;
    status: IntelligenceProviderStatus;
    observedAtMs: number;
    measuredFirstResultMs: number | null;
    failureRatePermille: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const STATUSES =
  new Set<IntelligenceProviderStatus>([
    'ready',
    'degraded',
    'unavailable',
  ]);
const KEYS =
  new Set([
    'protocolVersion',
    'providerRef',
    'modelRef',
    'status',
    'observedAtMs',
    'measuredFirstResultMs',
    'failureRatePermille',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseIntelligenceProviderHealth(
  input: unknown,
): IntelligenceProviderHealth | null {
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
    || typeof record.status !== 'string'
    || !STATUSES.has(
      record.status as
        IntelligenceProviderStatus,
    )
    || !safeInteger(record.observedAtMs)
    || (
      record.measuredFirstResultMs !== null
      && (
        !safeInteger(
          record.measuredFirstResultMs,
        )
        || (
          record.measuredFirstResultMs as number
        ) > 3_600_000
      )
    )
    || !safeInteger(
      record.failureRatePermille,
    )
    || (
      record.failureRatePermille as number
    ) > 1000
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
  return Object.freeze({
    protocolVersion: '1.0',
    providerRef:
      record.providerRef as string,
    modelRef:
      record.modelRef as string,
    status:
      record.status as
        IntelligenceProviderStatus,
    observedAtMs:
      record.observedAtMs as number,
    measuredFirstResultMs:
      record.measuredFirstResultMs as
        number | null,
    failureRatePermille:
      record.failureRatePermille as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
