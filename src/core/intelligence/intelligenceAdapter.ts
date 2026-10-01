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

import {
  type IntelligenceProviderFailure,
} from './intelligenceFailure';

export type IntelligenceAdapterInvocation =
  Readonly<{
    protocolVersion: '1.0';
    requestId: string;
    planId: string;
    providerRef: string;
    modelRef: string;
    service: IntelligenceServiceKind;
    generation: number;
    inputRef: string;
    streaming: boolean;
    deadlineAtMs: number | null;

    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type IntelligenceAdapterOutputEvent =
  Readonly<{
    protocolVersion: '1.0';
    requestId: string;
    planId: string;
    providerRef: string;
    modelRef: string;
    service: IntelligenceServiceKind;
    generation: number;
    sequence: number;
    resultRef: string;
    isFinal: boolean;
    observedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export interface IntelligenceAdapterSession {
  cancel(): Promise<void>;
}

export interface IntelligenceProviderAdapter {
  readonly providerRef: string;
  readonly modelRef: string;
  readonly service: IntelligenceServiceKind;

  invoke(
    request: IntelligenceAdapterInvocation,
    onOutput: (
      event: IntelligenceAdapterOutputEvent,
    ) => void,
    onFailure: (
      failure: IntelligenceProviderFailure,
    ) => void,
  ): Promise<IntelligenceAdapterSession>;
}

const SERVICES =
  new Set<IntelligenceServiceKind>([
    'general',
    'coding',
    'vision',
    'stt',
    'tts',
  ]);

const INVOCATION_KEYS =
  new Set([
    'protocolVersion',
    'requestId',
    'planId',
    'providerRef',
    'modelRef',
    'service',
    'generation',
    'inputRef',
    'streaming',
    'deadlineAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const OUTPUT_KEYS =
  new Set([
    'protocolVersion',
    'requestId',
    'planId',
    'providerRef',
    'modelRef',
    'service',
    'generation',
    'sequence',
    'resultRef',
    'isFinal',
    'observedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function baseValid(
  record: Record<string, unknown>,
): boolean {
  return (
    record.protocolVersion === '1.0'
    && typeof record.requestId === 'string'
    && INTELLIGENCE_REQUEST_ID.test(
      record.requestId,
    )
    && typeof record.planId === 'string'
    && INTELLIGENCE_PLAN_ID.test(
      record.planId,
    )
    && typeof record.providerRef === 'string'

    && INTELLIGENCE_PROVIDER_REF.test(
      record.providerRef,
    )
    && typeof record.modelRef === 'string'
    && INTELLIGENCE_MODEL_REF.test(
      record.modelRef,
    )
    && typeof record.service === 'string'
    && SERVICES.has(
      record.service as IntelligenceServiceKind,
    )
    && safeInteger(record.generation)
    && record.grantsExecutionAuthority
      === false
    && record.grantsSensorAuthority
      === false
    && record.grantsApprovalAuthority
      === false
    && record.grantsCapabilityAuthority
      === false
  );
}

export function parseIntelligenceAdapterInvocation(
  input: unknown,
): IntelligenceAdapterInvocation | null {
  const record =
    exactObject(
      input,
      INVOCATION_KEYS,
    );

  if (
    !record
    || !baseValid(record)
    || !isSafePublicReference(
      record.inputRef,
      240,
    )
    || typeof record.streaming !== 'boolean'

    || (
      record.deadlineAtMs !== null
      && !safeInteger(record.deadlineAtMs)
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    requestId: record.requestId as string,
    planId: record.planId as string,
    providerRef:
      record.providerRef as string,
    modelRef: record.modelRef as string,
    service:
      record.service as IntelligenceServiceKind,
    generation:
      record.generation as number,
    inputRef: record.inputRef as string,
    streaming: record.streaming as boolean,
    deadlineAtMs:
      record.deadlineAtMs as number | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function parseIntelligenceAdapterOutputEvent(
  input: unknown,
): IntelligenceAdapterOutputEvent | null {

  const record =
    exactObject(
      input,
      OUTPUT_KEYS,
    );

  if (
    !record
    || !baseValid(record)
    || !safeInteger(record.sequence)
    || !isSafePublicReference(
      record.resultRef,
      240,
    )
    || typeof record.isFinal !== 'boolean'
    || !safeInteger(record.observedAtMs)
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    requestId: record.requestId as string,
    planId: record.planId as string,
    providerRef:
      record.providerRef as string,
    modelRef: record.modelRef as string,
    service:
      record.service as IntelligenceServiceKind,
    generation:
      record.generation as number,
    sequence: record.sequence as number,
    resultRef: record.resultRef as string,
    isFinal: record.isFinal as boolean,
    observedAtMs:
      record.observedAtMs as number,

    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
