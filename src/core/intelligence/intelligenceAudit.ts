import {
  INTELLIGENCE_EVENT_ID,
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PLAN_ID,
  INTELLIGENCE_PROVIDER_REF,
  INTELLIGENCE_REQUEST_ID,
  exactObject,
  isSafePublicReference,
  safeInteger,
} from './intelligenceSecurity';

export type IntelligenceAuditKind =
  | 'route_planned'
  | 'route_failed'
  | 'provider_failed'
  | 'failover_allowed'
  | 'failover_denied'
  | 'result_completed';

export type IntelligenceAuditEvent =
  Readonly<{
    protocolVersion: '1.0';
    eventId: string;
    kind: IntelligenceAuditKind;
    requestId: string;
    planId: string | null;
    providerRef: string | null;
    modelRef: string | null;
    reasonCode: string;
    occurredAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KINDS =
  new Set<IntelligenceAuditKind>([
    'route_planned',
    'route_failed',
    'provider_failed',
    'failover_allowed',
    'failover_denied',
    'result_completed',
  ]);

const REASON =
  /^[a-z][a-z0-9_-]{0,95}$/;

const KEYS =
  new Set([
    'protocolVersion',
    'eventId',
    'kind',
    'requestId',
    'planId',
    'providerRef',
    'modelRef',
    'reasonCode',
    'occurredAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseIntelligenceAuditEvent(
  input: unknown,
): IntelligenceAuditEvent | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.eventId !== 'string'
    || !INTELLIGENCE_EVENT_ID.test(
      record.eventId,
    )
    || typeof record.kind !== 'string'
    || !KINDS.has(
      record.kind as IntelligenceAuditKind,
    )
    || typeof record.requestId !== 'string'
    || !INTELLIGENCE_REQUEST_ID.test(
      record.requestId,
    )
    || (
      record.planId !== null
      && (
        typeof record.planId !== 'string'
        || !INTELLIGENCE_PLAN_ID.test(
          record.planId,
        )
      )
    )
    || (
      record.providerRef !== null
      && (
        typeof record.providerRef !== 'string'
        || !INTELLIGENCE_PROVIDER_REF.test(
          record.providerRef,
        )
      )
    )
    || (
      record.modelRef !== null
      && (
        typeof record.modelRef !== 'string'
        || !INTELLIGENCE_MODEL_REF.test(
          record.modelRef,
        )
      )
    )
    || typeof record.reasonCode !== 'string'
    || !REASON.test(record.reasonCode)
    || !isSafePublicReference(
      record.reasonCode,
      96,
    )
    || !safeInteger(record.occurredAtMs)
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
    eventId: record.eventId as string,
    kind:
      record.kind as IntelligenceAuditKind,
    requestId:
      record.requestId as string,
    planId:
      record.planId as string | null,
    providerRef:
      record.providerRef as string | null,
    modelRef:
      record.modelRef as string | null,
    reasonCode:
      record.reasonCode as string,
    occurredAtMs:
      record.occurredAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
