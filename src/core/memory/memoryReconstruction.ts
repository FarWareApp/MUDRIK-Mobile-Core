import type {
  MemoryRetrievalProjection,
} from './memoryRetrieval';

import {
  ACCOUNT_ID,
  exactObject,
  isSafeMemoryText,
  safeInteger,
} from './memorySecurity';

export type ReconstructionRole =
  | 'user'
  | 'assistant'
  | 'system';

export type ReconstructionTranscriptEntry =
  Readonly<{
    messageId: string;
    role: ReconstructionRole;
    content: string;
    occurredAtMs: number;
  }>;

export type ReconstructionEphemeralEntry =
  Readonly<{
    contextId: string;
    content: string;
    occurredAtMs: number;
  }>;

export type MemoryReconstruction =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    conversationId: string;
    transcript:
      readonly ReconstructionTranscriptEntry[];
    ephemeralContext:
      readonly ReconstructionEphemeralEntry[];
    durableMemory:
      MemoryRetrievalProjection | null;
    memoryIncluded: boolean;
    generatedAtMs: number;
    totalBytes: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsToolAuthority: false;
  }>;

const MESSAGE_ID =
  /^msg_[a-z0-9][a-z0-9_-]{15,127}$/;

const CONTEXT_ID =
  /^ctx_[a-z0-9][a-z0-9_-]{15,127}$/;

const CONVERSATION_ID =
  /^conv_[a-z0-9][a-z0-9_-]{15,127}$/;

const ROOT_KEYS = new Set([
  'accountId',
  'conversationId',
  'transcript',
  'ephemeralContext',
  'memoryProjection',
  'generatedAtMs',
  'maxBytes',
]);

const TRANSCRIPT_KEYS = new Set([
  'messageId',
  'role',
  'content',
  'occurredAtMs',
]);

const EPHEMERAL_KEYS = new Set([
  'contextId',
  'content',
  'occurredAtMs',
]);

function utf8Bytes(
  value: string,
): number {
  return new TextEncoder()
    .encode(value)
    .byteLength;
}

function parseTranscript(
  input: unknown,
): readonly ReconstructionTranscriptEntry[]
  | null {
  if (
    !Array.isArray(input)
    || input.length > 512
  ) {
    return null;
  }

  const output:
    ReconstructionTranscriptEntry[] = [];
  let previousTime = -1;

  for (const entry of input) {
    const record =
      exactObject(
        entry,
        TRANSCRIPT_KEYS,
      );

    if (
      !record
      || typeof record.messageId
        !== 'string'
      || !MESSAGE_ID.test(
        record.messageId,
      )
      || ![
        'user',
        'assistant',
        'system',
      ].includes(
        record.role as string,
      )
      || !isSafeMemoryText(
        record.content,
        16_000,
      )
      || !safeInteger(
        record.occurredAtMs,
      )
      || (record.occurredAtMs as number)
        < previousTime
    ) {
      return null;
    }

    previousTime =
      record.occurredAtMs as number;

    output.push(
      Object.freeze({
        messageId:
          record.messageId,
        role:
          record.role as
            ReconstructionRole,
        content:
          record.content as string,
        occurredAtMs:
          record.occurredAtMs as number,
      }),
    );
  }

  return Object.freeze(output);
}

function parseEphemeral(
  input: unknown,
): readonly ReconstructionEphemeralEntry[]
  | null {
  if (
    !Array.isArray(input)
    || input.length > 128
  ) {
    return null;
  }

  const output:
    ReconstructionEphemeralEntry[] = [];

  for (const entry of input) {
    const record =
      exactObject(
        entry,
        EPHEMERAL_KEYS,
      );

    if (
      !record
      || typeof record.contextId
        !== 'string'
      || !CONTEXT_ID.test(
        record.contextId,
      )
      || !isSafeMemoryText(
        record.content,
        8000,
      )
      || !safeInteger(
        record.occurredAtMs,
      )
    ) {
      return null;
    }

    output.push(
      Object.freeze({
        contextId:
          record.contextId,
        content:
          record.content as string,
        occurredAtMs:
          record.occurredAtMs as number,
      }),
    );
  }

  return Object.freeze(output);
}

function validProjection(
  projection:
    MemoryRetrievalProjection | null,
  accountId: string,
): boolean {
  if (projection === null) {
    return true;
  }

  return (
    projection.protocolVersion
      === '1.0'
    && projection.accountId
      === accountId
    && projection
      .grantsExecutionAuthority
      === false
    && projection
      .grantsSensorAuthority
      === false
    && projection
      .grantsToolAuthority
      === false
    && Array.isArray(
      projection.entries,
    )
    && projection.entries
      .every(
        (entry) =>
          entry
            .grantsExecutionAuthority
            === false
          && entry
            .grantsSensorAuthority
            === false
          && entry
            .grantsToolAuthority
            === false,
      )
  );
}

export function createMemoryReconstruction(
  input: unknown,
): MemoryReconstruction | null {
  const root =
    exactObject(
      input,
      ROOT_KEYS,
    );

  if (
    !root
    || typeof root.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      root.accountId,
    )
    || typeof root.conversationId
      !== 'string'
    || !CONVERSATION_ID.test(
      root.conversationId,
    )
    || !safeInteger(
      root.generatedAtMs,
    )
    || !safeInteger(
      root.maxBytes,
    )
    || (root.maxBytes as number)
      < 1024
    || (root.maxBytes as number)
      > 512 * 1024
  ) {
    return null;
  }

  const transcript =
    parseTranscript(
      root.transcript,
    );
  const ephemeralContext =
    parseEphemeral(
      root.ephemeralContext,
    );
  const memoryProjection =
    (
      root.memoryProjection
      ?? null
    ) as
      MemoryRetrievalProjection | null;

  if (
    !transcript
    || !ephemeralContext
    || !validProjection(
      memoryProjection,
      root.accountId,
    )
  ) {
    return null;
  }

  const projected = {
    transcript,
    ephemeralContext,
    durableMemory:
      memoryProjection,
  };

  const totalBytes =
    utf8Bytes(
      JSON.stringify(projected),
    );

  if (
    totalBytes
      > (root.maxBytes as number)
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    accountId:
      root.accountId,
    conversationId:
      root.conversationId,
    transcript,
    ephemeralContext,
    durableMemory:
      memoryProjection,
    memoryIncluded:
      memoryProjection !== null,
    generatedAtMs:
      root.generatedAtMs as number,
    totalBytes,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsToolAuthority: false,
  });
}
