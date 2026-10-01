import {
  type KnowledgeChunk,
  parseKnowledgeChunk,
} from './knowledgeChunk';

import {
  type KnowledgePolicy,
  parseKnowledgePolicy,
} from './knowledgePolicy';

import {
  type KnowledgeSourceRevision,
  parseKnowledgeSourceRevision,
} from './knowledgeSource';

import {
  type KnowledgeTombstone,
  parseKnowledgeTombstone,
} from './knowledgeTombstone';

import {
  ACCOUNT_ID,
  SHA256,
  WORKSPACE_ID,
  exactObject,
  safeInteger,
} from './knowledgeSecurity';

export type KnowledgeWorkspaceState =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    workspaceId: string;
    generation: number;
    policy: KnowledgePolicy;
    sources:
      readonly KnowledgeSourceRevision[];
    chunks:
      readonly KnowledgeChunk[];
    tombstones:
      readonly KnowledgeTombstone[];
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type SealedKnowledgeSnapshot =
  Readonly<{
    protocolVersion: '1.0';
    accountId: string;
    workspaceId: string;
    sealedAtMs: number;
    state:
      KnowledgeWorkspaceState;
    integrityDigest: string;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export interface KnowledgeIntegrityProvider {
  digest(
    payload: string,
  ): Promise<string> | string;

  verify(
    payload: string,
    digest: string,
  ): Promise<boolean> | boolean;
}

const STATE_KEYS =
  new Set([
    'protocolVersion',
    'accountId',
    'workspaceId',
    'generation',
    'policy',
    'sources',
    'chunks',
    'tombstones',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const SNAPSHOT_KEYS =
  new Set([
    'protocolVersion',
    'accountId',
    'workspaceId',
    'sealedAtMs',
    'state',
    'integrityDigest',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function canonicalize(
  value: unknown,
): string {
  if (
    value === null
    || typeof value !== 'object'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return (
      '['
      + value
        .map(canonicalize)
        .join(',')
      + ']'
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;
  const keys =
    Object.keys(record).sort();

  return (
    '{'
    + keys
      .map(
        (key) =>
          JSON.stringify(key)
          + ':'
          + canonicalize(
            record[key],
          ),
      )
      .join(',')
    + '}'
  );
}

function sourceKey(
  source:
    KnowledgeSourceRevision,
): string {
  return (
    source.sourceId
    + ':'
    + String(source.revision)
  );
}

function validateSourceHistory(
  sources:
    readonly KnowledgeSourceRevision[],
  chunks:
    readonly KnowledgeChunk[],
  tombstones:
    readonly KnowledgeTombstone[],
): boolean {
  const groups =
    new Map<
      string,
      KnowledgeSourceRevision[]
    >();

  for (const source of sources) {
    const group =
      groups.get(source.sourceId)
      ?? [];

    group.push(source);
    groups.set(
      source.sourceId,
      group,
    );
  }

  const chunksBySource =
    new Map<
      string,
      KnowledgeChunk[]
    >();

  for (const chunk of chunks) {
    const group =
      chunksBySource.get(
        chunk.sourceId,
      ) ?? [];

    group.push(chunk);
    chunksBySource.set(
      chunk.sourceId,
      group,
    );
  }

  const tombstoneBySource =
    new Map(
      tombstones.map(
        (tombstone) => [
          tombstone.sourceId,
          tombstone,
        ],
      ),
    );

  for (
    const [
      sourceId,
      group,
    ] of groups
  ) {
    group.sort(
      (a, b) =>
        a.revision - b.revision,
    );

    for (
      let index = 0;
      index < group.length;
      index += 1
    ) {
      const source =
        group[index];
      const expectedRevision =
        index + 1;

      if (
        source.revision
          !== expectedRevision
      ) {
        return false;
      }

      const next =
        group[index + 1];

      if (next) {
        if (
          source.state
            !== 'superseded'
          || source
            .supersededByRevision
            !== next.revision
        ) {
          return false;
        }
      } else if (
        source.state
          === 'superseded'
      ) {
        return false;
      }
    }

    const latest =
      group[group.length - 1];
    const sourceChunks =
      chunksBySource.get(sourceId)
      ?? [];
    const tombstone =
      tombstoneBySource.get(
        sourceId,
      );

    if (
      latest.state === 'active'
    ) {
      if (
        tombstone
        || sourceChunks.length < 1
      ) {
        return false;
      }

      sourceChunks.sort(
        (a, b) =>
          a.ordinal - b.ordinal,
      );

      let previousEnd = 0;
      let bytes = 0;

      for (
        let index = 0;
        index < sourceChunks.length;
        index += 1
      ) {
        const chunk =
          sourceChunks[index];

        if (
          chunk.ordinal !== index
          || chunk.sourceRevision
            !== latest.revision
          || chunk.sourceDigest
            !== latest.contentDigest
          || chunk.charStart
            !== previousEnd
        ) {
          return false;
        }

        previousEnd =
          chunk.charEnd;
        bytes +=
          chunk.byteLength;
      }

      if (
        bytes
          !== latest.contentBytes
      ) {
        return false;
      }
    } else if (
      latest.state === 'deleted'
      || latest.state === 'revoked'
    ) {
      if (
        sourceChunks.length !== 0
        || !tombstone
        || tombstone
          .deletedRevision
          !== latest.revision
      ) {
        return false;
      }
    } else {
      return false;
    }
  }

  for (const chunk of chunks) {
    if (!groups.has(
      chunk.sourceId,
    )) {
      return false;
    }
  }

  for (
    const tombstone of tombstones
  ) {
    if (!groups.has(
      tombstone.sourceId,
    )) {
      return false;
    }
  }

  return true;
}

export function parseKnowledgeWorkspaceState(
  input: unknown,
): KnowledgeWorkspaceState | null {
  const record =
    exactObject(
      input,
      STATE_KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.workspaceId
      !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || !safeInteger(
      record.generation,
    )
    || !Array.isArray(
      record.sources,
    )
    || record.sources.length
      > 8192
    || !Array.isArray(
      record.chunks,
    )
    || record.chunks.length
      > 65_536
    || !Array.isArray(
      record.tombstones,
    )
    || record.tombstones.length
      > 8192
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

  const policy =
    parseKnowledgePolicy(
      record.policy,
    );

  if (
    !policy
    || policy.accountId
      !== record.accountId
    || policy.workspaceId
      !== record.workspaceId
  ) {
    return null;
  }

  const sources:
    KnowledgeSourceRevision[] = [];
  const sourceKeys =
    new Set<string>();

  for (
    const inputSource of
      record.sources
  ) {
    const source =
      parseKnowledgeSourceRevision(
        inputSource,
      );

    if (
      !source
      || source.accountId
        !== policy.accountId
      || source.workspaceId
        !== policy.workspaceId
      || source.policyId
        !== policy.policyId
      || source.policyRevision
        > policy.revision
      || sourceKeys.has(
        sourceKey(source),
      )
    ) {
      return null;
    }

    sourceKeys.add(
      sourceKey(source),
    );
    sources.push(source);
  }

  const chunks:
    KnowledgeChunk[] = [];
  const chunkIds =
    new Set<string>();

  for (
    const inputChunk of
      record.chunks
  ) {
    const chunk =
      parseKnowledgeChunk(
        inputChunk,
      );

    if (
      !chunk
      || chunkIds.has(
        chunk.chunkId,
      )
    ) {
      return null;
    }

    chunkIds.add(chunk.chunkId);
    chunks.push(chunk);
  }

  const tombstones:
    KnowledgeTombstone[] = [];
  const tombstoneIds =
    new Set<string>();

  for (
    const inputTombstone of
      record.tombstones
  ) {
    const tombstone =
      parseKnowledgeTombstone(
        inputTombstone,
      );

    if (
      !tombstone
      || tombstone.accountId
        !== policy.accountId
      || tombstone.workspaceId
        !== policy.workspaceId
      || tombstoneIds.has(
        tombstone.sourceId,
      )
    ) {
      return null;
    }

    tombstoneIds.add(
      tombstone.sourceId,
    );
    tombstones.push(tombstone);
  }

  sources.sort(
    (a, b) =>
      a.sourceId.localeCompare(
        b.sourceId,
      )
      || a.revision
        - b.revision,
  );
  chunks.sort(
    (a, b) =>
      a.sourceId.localeCompare(
        b.sourceId,
      )
      || a.ordinal
        - b.ordinal,
  );
  tombstones.sort(
    (a, b) =>
      a.sourceId.localeCompare(
        b.sourceId,
      ),
  );

  if (
    !validateSourceHistory(
      sources,
      chunks,
      tombstones,
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    accountId:
      record.accountId as string,
    workspaceId:
      record.workspaceId as string,
    generation:
      record.generation as number,
    policy,
    sources:
      Object.freeze(sources),
    chunks:
      Object.freeze(chunks),
    tombstones:
      Object.freeze(tombstones),
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function snapshotPayload(
  snapshot:
    Omit<
      SealedKnowledgeSnapshot,
      'integrityDigest'
    >,
): string {
  return canonicalize(snapshot);
}

export async function sealKnowledgeWorkspaceState(
  stateInput: unknown,
  sealedAtMs: number,
  provider:
    KnowledgeIntegrityProvider,
): Promise<
  SealedKnowledgeSnapshot | null
> {
  const state =
    parseKnowledgeWorkspaceState(
      stateInput,
    );

  if (
    !state
    || !safeInteger(sealedAtMs)
    || !provider
    || typeof provider.digest
      !== 'function'
    || typeof provider.verify
      !== 'function'
  ) {
    return null;
  }

  const unsigned =
    Object.freeze({
      protocolVersion:
        '1.0' as const,
      accountId: state.accountId,
      workspaceId:
        state.workspaceId,
      sealedAtMs,
      state,
      grantsExecutionAuthority:
        false as const,
      grantsSensorAuthority:
        false as const,
      grantsApprovalAuthority:
        false as const,
      grantsCapabilityAuthority:
        false as const,
    });

  let integrityDigest: unknown;

  try {
    integrityDigest =
      await provider.digest(
        snapshotPayload(unsigned),
      );
  } catch {
    return null;
  }

  if (
    typeof integrityDigest
      !== 'string'
    || !SHA256.test(
      integrityDigest,
    )
  ) {
    return null;
  }

  return Object.freeze({
    ...unsigned,
    integrityDigest,
  });
}

export async function verifyKnowledgeSnapshot(
  input: unknown,
  provider:
    KnowledgeIntegrityProvider,
): Promise<
  SealedKnowledgeSnapshot | null
> {
  const record =
    exactObject(
      input,
      SNAPSHOT_KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.workspaceId
      !== 'string'
    || !WORKSPACE_ID.test(
      record.workspaceId,
    )
    || !safeInteger(
      record.sealedAtMs,
    )
    || typeof record.integrityDigest
      !== 'string'
    || !SHA256.test(
      record.integrityDigest,
    )
    || record.grantsExecutionAuthority
      !== false
    || record.grantsSensorAuthority
      !== false
    || record.grantsApprovalAuthority
      !== false
    || record.grantsCapabilityAuthority
      !== false
    || !provider
    || typeof provider.verify
      !== 'function'
  ) {
    return null;
  }

  const state =
    parseKnowledgeWorkspaceState(
      record.state,
    );

  if (
    !state
    || state.accountId
      !== record.accountId
    || state.workspaceId
      !== record.workspaceId
  ) {
    return null;
  }

  const unsigned =
    Object.freeze({
      protocolVersion:
        '1.0' as const,
      accountId:
        record.accountId as string,
      workspaceId:
        record.workspaceId as string,
      sealedAtMs:
        record.sealedAtMs as number,
      state,
      grantsExecutionAuthority:
        false as const,
      grantsSensorAuthority:
        false as const,
      grantsApprovalAuthority:
        false as const,
      grantsCapabilityAuthority:
        false as const,
    });

  let verified = false;

  try {
    verified =
      await provider.verify(
        snapshotPayload(unsigned),
        record.integrityDigest,
      );
  } catch {
    return null;
  }

  if (!verified) {
    return null;
  }

  return Object.freeze({
    ...unsigned,
    integrityDigest:
      record.integrityDigest,
  });
}
