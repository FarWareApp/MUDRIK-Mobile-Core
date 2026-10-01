import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PLAN_ID,
  INTELLIGENCE_PROVIDER_REF,
  INTELLIGENCE_REQUEST_ID,
  exactObject,
  isSafePublicReference,
  safeInteger,
} from './intelligenceSecurity';

import {
  type IntelligenceServiceKind,
} from './intelligenceProvider';

export type IntelligenceResultEnvelope =
  Readonly<{
    protocolVersion: '1.0';
    requestId: string;
    planId: string;
    providerRef: string;
    modelRef: string;
    service: IntelligenceServiceKind;
    generation: number;
    resultRef: string;
    completedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;
const KEYS =
  new Set([
    'protocolVersion',
    'requestId',
    'planId',
    'providerRef',
    'modelRef',
    'service',
    'generation',
    'resultRef',
    'completedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseIntelligenceResultEnvelope(
  input: unknown,
): IntelligenceResultEnvelope | null {
  const record =
    exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.requestId !== 'string'
    || !INTELLIGENCE_REQUEST_ID.test(
      record.requestId,
    )
    || typeof record.planId !== 'string'
    || !INTELLIGENCE_PLAN_ID.test(
      record.planId,
    )
    || typeof record.providerRef !== 'string'
    || !INTELLIGENCE_PROVIDER_REF.test(
      record.providerRef,
    )
    || typeof record.modelRef !== 'string'
    || !INTELLIGENCE_MODEL_REF.test(
      record.modelRef,
    )
    || ![
      'general',
      'coding',
      'vision',
      'stt',
      'tts',
    ].includes(record.service as string)
    || !safeInteger(record.generation)
    || !isSafePublicReference(
      record.resultRef,
      240,
    )
    || !safeInteger(record.completedAtMs)
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
    requestId:
      record.requestId as string,
    planId: record.planId as string,
    providerRef:
      record.providerRef as string,
    modelRef:
      record.modelRef as string,
    service:
      record.service as IntelligenceServiceKind,
    generation:
      record.generation as number,
    resultRef:
      record.resultRef as string,
    completedAtMs:
      record.completedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
