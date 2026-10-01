import {
  CREDENTIAL_REF,
  INTEGRATION_ADAPTER_ID,
  INTEGRATION_ID,
  exactObject,
  safeLabel,
} from './integrationSecurity';

export type IntegrationAdapterKind =
  | 'smart_home'
  | 'media_service'
  | 'external_service';

export type IntegrationAdapterStatus =
  | 'ready'
  | 'degraded'
  | 'unavailable';

export type IntegrationAdapterRegistration =
  Readonly<{
    protocolVersion: '1.0';
    adapterId: string;
    integrationId: string;
    kind: IntegrationAdapterKind;
    displayName: string;
    status: IntegrationAdapterStatus;
    credentialRef: string | null;
    declaredAtMs: number;
    expiresAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type PublicIntegrationAdapter =
  Omit<
    IntegrationAdapterRegistration,
    'credentialRef'
  >;

const KINDS =
  new Set<IntegrationAdapterKind>([
    'smart_home',
    'media_service',
    'external_service',
  ]);

const STATUSES =
  new Set<IntegrationAdapterStatus>([
    'ready',
    'degraded',
    'unavailable',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'adapterId',
    'integrationId',
    'kind',
    'displayName',
    'status',
    'credentialRef',
    'declaredAtMs',
    'expiresAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseIntegrationAdapterRegistration(
  input: unknown,
): IntegrationAdapterRegistration | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.adapterId !== 'string'
    || !INTEGRATION_ADAPTER_ID.test(
      record.adapterId,
    )
    || typeof record.integrationId
      !== 'string'
    || !INTEGRATION_ID.test(
      record.integrationId,
    )
    || typeof record.kind !== 'string'
    || !KINDS.has(
      record.kind as IntegrationAdapterKind,
    )
    || !safeLabel(record.displayName)
    || typeof record.status !== 'string'
    || !STATUSES.has(
      record.status as
        IntegrationAdapterStatus,
    )
    || !Number.isSafeInteger(
      record.declaredAtMs,
    )
    || Number(record.declaredAtMs) < 0
    || !Number.isSafeInteger(
      record.expiresAtMs,
    )
    || Number(record.expiresAtMs)
      <= Number(record.declaredAtMs)
    || (
      record.credentialRef !== null
      && (
        typeof record.credentialRef
          !== 'string'
        || !CREDENTIAL_REF.test(
          record.credentialRef,
        )
      )
    )
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
    adapterId: record.adapterId as string,
    integrationId:
      record.integrationId as string,
    kind:
      record.kind as IntegrationAdapterKind,
    displayName:
      record.displayName as string,
    status:
      record.status as
        IntegrationAdapterStatus,
    credentialRef:
      record.credentialRef as string | null,
    declaredAtMs:
      record.declaredAtMs as number,
    expiresAtMs:
      record.expiresAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function toPublicIntegrationAdapter(
  value: IntegrationAdapterRegistration,
): PublicIntegrationAdapter {
  const {
    credentialRef: _credentialRef,
    ...publicValue
  } = value;

  return Object.freeze(publicValue);
}
