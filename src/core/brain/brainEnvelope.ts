import {
  BRAIN_ATTACHMENT_REF,
  BRAIN_EVENT_ID,
  BRAIN_PAYLOAD_REF,
  BRAIN_REQUEST_ID,
  BRAIN_SESSION_ID,
  BRAIN_TRACE_ID,
  LANGUAGE_TAG,
  exactObject,
  safeInteger,
  safeReasonCode,
  safeReference,
} from './brainSecurity';

export const BRAIN_INPUT_KINDS =
  Object.freeze([
    'text',
    'voice',
    'image',
    'video',
    'file',
    'command',
    'structured-event',
  ] as const);

export type BrainInputKind =
  typeof BRAIN_INPUT_KINDS[number];

export const BRAIN_OUTPUT_KINDS =
  Object.freeze([
    'text',
    'voice',
    'image',
    'video',
    'file',
    'action',
    'status',
    'error',
    'structured-result',
  ] as const);

export type BrainOutputKind =
  typeof BRAIN_OUTPUT_KINDS[number];

export type BrainTransportPreference =
  | 'interactive'
  | 'background';

export type BrainInputEnvelope =
  Readonly<{
    protocolVersion: '1.0';
    requestId: string;
    sessionId: string;
    traceId: string;
    conversationId: string;
    workspaceId: string | null;
    kind: BrainInputKind;
    payloadRef: string;
    attachmentRefs: readonly string[];
    languageTag: string | null;
    createdAtMs: number;
    deadlineAtMs: number | null;
    transportPreference: BrainTransportPreference;
    requiresVerification: boolean;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type BrainOutputEvent =
  Readonly<{
    protocolVersion: '1.0';
    eventId: string;
    requestId: string;
    sessionId: string;
    traceId: string;
    conversationId: string;
    kind: BrainOutputKind;
    sequence: number;
    payloadRef: string | null;
    reasonCode: string | null;
    isFinal: boolean;
    observedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const INPUT_KINDS =
  new Set<BrainInputKind>(BRAIN_INPUT_KINDS);

const OUTPUT_KINDS =
  new Set<BrainOutputKind>(BRAIN_OUTPUT_KINDS);

const TRANSPORTS =
  new Set<BrainTransportPreference>([
    'interactive',
    'background',
  ]);

const INPUT_KEYS =
  new Set([
    'protocolVersion',
    'requestId',
    'sessionId',
    'traceId',
    'conversationId',
    'workspaceId',
    'kind',
    'payloadRef',
    'attachmentRefs',
    'languageTag',
    'createdAtMs',
    'deadlineAtMs',
    'transportPreference',
    'requiresVerification',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const OUTPUT_KEYS =
  new Set([
    'protocolVersion',
    'eventId',
    'requestId',
    'sessionId',
    'traceId',
    'conversationId',
    'kind',
    'sequence',
    'payloadRef',
    'reasonCode',
    'isFinal',
    'observedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function authorityFree(
  record: Record<string, unknown>,
): boolean {
  return (
    record.grantsExecutionAuthority === false
    && record.grantsSensorAuthority === false
    && record.grantsApprovalAuthority === false
    && record.grantsCapabilityAuthority === false
  );
}

function parseAttachmentRefs(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 32
  ) {
    return null;
  }

  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !BRAIN_ATTACHMENT_REF.test(item)
      || seen.has(item)
    ) {
      return null;
    }
    seen.add(item);
    output.push(item);
  }

  return Object.freeze(output);
}

export function parseBrainInputEnvelope(
  input: unknown,
): BrainInputEnvelope | null {
  const record = exactObject(input, INPUT_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.requestId !== 'string'
    || !BRAIN_REQUEST_ID.test(record.requestId)
    || typeof record.sessionId !== 'string'
    || !BRAIN_SESSION_ID.test(record.sessionId)
    || typeof record.traceId !== 'string'
    || !BRAIN_TRACE_ID.test(record.traceId)
    || !safeReference(record.conversationId, 180)
    || (
      record.workspaceId !== null
      && !safeReference(record.workspaceId, 180)
    )
    || typeof record.kind !== 'string'
    || !INPUT_KINDS.has(record.kind as BrainInputKind)
    || typeof record.payloadRef !== 'string'
    || !BRAIN_PAYLOAD_REF.test(record.payloadRef)
    || (
      record.languageTag !== null
      && (
        typeof record.languageTag !== 'string'
        || !LANGUAGE_TAG.test(record.languageTag)
      )
    )
    || !safeInteger(record.createdAtMs)
    || (
      record.deadlineAtMs !== null
      && (
        !safeInteger(record.deadlineAtMs)
        || Number(record.deadlineAtMs)
          <= Number(record.createdAtMs)
      )
    )
    || typeof record.transportPreference !== 'string'
    || !TRANSPORTS.has(
      record.transportPreference as BrainTransportPreference,
    )
    || typeof record.requiresVerification !== 'boolean'
    || !authorityFree(record)
  ) {
    return null;
  }

  const attachmentRefs =
    parseAttachmentRefs(record.attachmentRefs);

  if (!attachmentRefs) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    requestId: record.requestId as string,
    sessionId: record.sessionId as string,
    traceId: record.traceId as string,
    conversationId: record.conversationId as string,
    workspaceId: record.workspaceId as string | null,
    kind: record.kind as BrainInputKind,
    payloadRef: record.payloadRef as string,
    attachmentRefs,
    languageTag:
      record.languageTag === null
        ? null
        : (record.languageTag as string).toLowerCase(),
    createdAtMs: record.createdAtMs as number,
    deadlineAtMs: record.deadlineAtMs as number | null,
    transportPreference:
      record.transportPreference as BrainTransportPreference,
    requiresVerification:
      record.requiresVerification as boolean,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function parseBrainOutputEvent(
  input: unknown,
): BrainOutputEvent | null {
  const record = exactObject(input, OUTPUT_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.eventId !== 'string'
    || !BRAIN_EVENT_ID.test(record.eventId)
    || typeof record.requestId !== 'string'
    || !BRAIN_REQUEST_ID.test(record.requestId)
    || typeof record.sessionId !== 'string'
    || !BRAIN_SESSION_ID.test(record.sessionId)
    || typeof record.traceId !== 'string'
    || !BRAIN_TRACE_ID.test(record.traceId)
    || !safeReference(record.conversationId, 180)
    || typeof record.kind !== 'string'
    || !OUTPUT_KINDS.has(record.kind as BrainOutputKind)
    || !safeInteger(record.sequence)
    || (
      record.payloadRef !== null
      && (
        typeof record.payloadRef !== 'string'
        || !BRAIN_PAYLOAD_REF.test(record.payloadRef)
      )
    )
    || (
      record.reasonCode !== null
      && !safeReasonCode(record.reasonCode)
    )
    || typeof record.isFinal !== 'boolean'
    || !safeInteger(record.observedAtMs)
    || !authorityFree(record)
  ) {
    return null;
  }

  const kind = record.kind as BrainOutputKind;
  const payloadRef = record.payloadRef as string | null;
  const reasonCode = record.reasonCode as string | null;

  if (
    kind === 'error'
      ? reasonCode === null
      : reasonCode !== null
  ) {
    return null;
  }

  if (
    kind === 'error'
      ? payloadRef !== null
      : payloadRef === null
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    eventId: record.eventId as string,
    requestId: record.requestId as string,
    sessionId: record.sessionId as string,
    traceId: record.traceId as string,
    conversationId: record.conversationId as string,
    kind,
    sequence: record.sequence as number,
    payloadRef,
    reasonCode,
    isFinal: record.isFinal as boolean,
    observedAtMs: record.observedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
