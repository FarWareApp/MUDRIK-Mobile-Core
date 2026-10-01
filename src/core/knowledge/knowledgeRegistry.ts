import {
  ingestKnowledgeSource,
  type KnowledgeDigestProvider,
} from './knowledgeIngestion';

import {
  parseKnowledgePolicy,
  type KnowledgePolicy,
} from './knowledgePolicy';

import {
  parseKnowledgeQuery,
} from './knowledgeQuery';

import {
  parseKnowledgeSourceInput,
  parseKnowledgeSourceRevision,
  type KnowledgeSourceRevision,
} from './knowledgeSource';

import {
  type KnowledgeChunk,
} from './knowledgeChunk';

import {
  KnowledgeDerivedIndex,
  type KnowledgeDerivedIndexAdapter,
  type PreparedKnowledgeIndex,
} from './knowledgeIndex';

import {
  buildKnowledgeProjection,
  rankKnowledgeCandidates,
  type KnowledgeProjection,
} from './knowledgeRetrieval';

import {
  parseKnowledgeTombstone,
  type KnowledgeTombstone,
  type KnowledgeTombstoneReason,
} from './knowledgeTombstone';

import {
  ACCOUNT_ID,
  KNOWLEDGE_SOURCE_ID,
  WORKSPACE_ID,
  safeInteger,
} from './knowledgeSecurity';

import {
  parseKnowledgeWorkspaceState,
  sealKnowledgeWorkspaceState,
  verifyKnowledgeSnapshot,
  type KnowledgeIntegrityProvider,
  type KnowledgeWorkspaceState,
  type SealedKnowledgeSnapshot,
} from './knowledgeRepository';

export type KnowledgeRegistryResult<T> =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason: string;
    value: T | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

function result<T>(
  accepted: boolean,
  reason: string,
  value: T | null = null,
  duplicate = false,
): KnowledgeRegistryResult<T> {
  return Object.freeze({
    accepted,
    duplicate,
    reason,
    value,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function workspaceKey(
  accountId: string,
  workspaceId: string,
): string {
  return (
    accountId
    + ':'
    + workspaceId
  );
}

function comparableSource(
  source: KnowledgeSourceRevision,
): unknown {
  return {
    protocolVersion:
      source.protocolVersion,
    sourceId: source.sourceId,
    accountId: source.accountId,
    workspaceId:
      source.workspaceId,
    policyId: source.policyId,
    policyRevision:
      source.policyRevision,
    sourceKind: source.sourceKind,
    canonicalLocator:
      source.canonicalLocator,
    publisher: source.publisher,
    provenanceType:
      source.provenanceType,
    provenanceRef:
      source.provenanceRef,
    official: source.official,
    version: source.version,
    revision: source.revision,
    contentDigest:
      source.contentDigest,
    contentBytes:
      source.contentBytes,
    observedAtMs:
      source.observedAtMs,
    validUntilMs:
      source.validUntilMs,
    license: source.license,
  };
}

function sameRevision(
  a: KnowledgeSourceRevision,
  b: KnowledgeSourceRevision,
): boolean {
  return (
    JSON.stringify(
      comparableSource(a),
    )
    === JSON.stringify(
      comparableSource(b),
    )
  );
}

function immutableIdentityMatches(
  a: KnowledgeSourceRevision,
  b: KnowledgeSourceRevision,
): boolean {
  return (
    a.sourceId === b.sourceId
    && a.accountId === b.accountId
    && a.workspaceId
      === b.workspaceId
    && a.sourceKind === b.sourceKind
    && a.canonicalLocator
      === b.canonicalLocator
    && a.publisher === b.publisher
    && a.provenanceType
      === b.provenanceType
    && a.provenanceRef
      === b.provenanceRef
  );
}

export class KnowledgeRegistry {
  private readonly digestProvider:
    KnowledgeDigestProvider;

  private readonly policies =
    new Map<string, KnowledgePolicy>();

  private readonly latestSources =
    new Map<
      string,
      KnowledgeSourceRevision
    >();

  private readonly sourceHistory =
    new Map<
      string,
      Map<
        number,
        KnowledgeSourceRevision
      >
    >();

  private readonly derivedIndex:
    KnowledgeDerivedIndexAdapter;

  private readonly tombstones =
    new Map<
      string,
      KnowledgeTombstone
    >();

  private readonly generations =
    new Map<string, number>();

  private readonly issuedProjections =
    new WeakSet<object>();

  constructor({
    digestProvider,
    derivedIndex =
      new KnowledgeDerivedIndex(),
  }: {
    digestProvider:
      KnowledgeDigestProvider;
    derivedIndex?:
      KnowledgeDerivedIndexAdapter;
  }) {
    if (
      !digestProvider
      || typeof digestProvider.digest
        !== 'function'
    ) {
      throw new TypeError(
        'Knowledge digest provider is required.',
      );
    }

    if (
      !derivedIndex
      || typeof derivedIndex.prepare
        !== 'function'
      || typeof derivedIndex.publish
        !== 'function'
      || typeof derivedIndex.invalidate
        !== 'function'
      || typeof derivedIndex.getEntry
        !== 'function'
      || typeof derivedIndex.getChunks
        !== 'function'
      || typeof derivedIndex.restore
        !== 'function'
    ) {
      throw new TypeError(
        'Knowledge derived index is required.',
      );
    }

    this.digestProvider =
      digestProvider;
    this.derivedIndex =
      derivedIndex;
  }

  private generationFor(
    accountId: string,
    workspaceId: string,
  ): number {
    return (
      this.generations.get(
        workspaceKey(
          accountId,
          workspaceId,
        ),
      )
      ?? 0
    );
  }

  private bumpGeneration(
    accountId: string,
    workspaceId: string,
  ): number {
    const key =
      workspaceKey(
        accountId,
        workspaceId,
      );
    const next =
      this.generationFor(
        accountId,
        workspaceId,
      ) + 1;

    this.generations.set(
      key,
      next,
    );

    return next;
  }

  setPolicy(
    input: unknown,
  ): KnowledgeRegistryResult<
    KnowledgePolicy
  > {
    const policy =
      parseKnowledgePolicy(input);

    if (!policy) {
      return result(
        false,
        'policy_invalid',
      );
    }

    const key =
      workspaceKey(
        policy.accountId,
        policy.workspaceId,
      );
    const current =
      this.policies.get(key);

    if (!current) {
      if (policy.revision !== 1) {
        return result(
          false,
          'policy_revision_gap',
        );
      }

      this.policies.set(
        key,
        policy,
      );
      this.bumpGeneration(
        policy.accountId,
        policy.workspaceId,
      );

      return result(
        true,
        'policy_set',
        policy,
      );
    }

    if (
      current.policyId
        !== policy.policyId
    ) {
      return result(
        false,
        'policy_identity_conflict',
        current,
      );
    }

    if (
      policy.revision
        === current.revision
    ) {
      return (
        JSON.stringify(policy)
        === JSON.stringify(current)
      )
        ? result(
            true,
            'duplicate',
            current,
            true,
          )
        : result(
            false,
            'policy_revision_conflict',
            current,
          );
    }

    if (
      policy.revision
        < current.revision
    ) {
      return result(
        false,
        'policy_revision_stale',
        current,
      );
    }

    if (
      policy.revision
        !== current.revision + 1
    ) {
      return result(
        false,
        'policy_revision_gap',
        current,
      );
    }

    if (
      policy.updatedAtMs
        < current.updatedAtMs
    ) {
      return result(
        false,
        'policy_time_rollback',
        current,
      );
    }

    this.policies.set(
      key,
      policy,
    );
    this.bumpGeneration(
      policy.accountId,
      policy.workspaceId,
    );

    return result(
      true,
      'policy_updated',
      policy,
    );
  }

  async ingest({
    source: sourceInput,
    trustedNowMs,
  }: {
    source: unknown;
    trustedNowMs: number;
  }): Promise<
    KnowledgeRegistryResult<
      KnowledgeSourceRevision
    >
  > {
    const source =
      parseKnowledgeSourceInput(
        sourceInput,
      );

    if (
      !source
      || !safeInteger(
        trustedNowMs,
      )
    ) {
      return result(
        false,
        'ingestion_invalid',
      );
    }

    if (
      this.tombstones.has(
        source.sourceId,
      )
    ) {
      return result(
        false,
        'source_tombstoned',
      );
    }

    const policy =
      this.policies.get(
        workspaceKey(
          source.accountId,
          source.workspaceId,
        ),
      );

    if (!policy) {
      return result(
        false,
        'policy_unknown',
      );
    }

    const prepared =
      await ingestKnowledgeSource({
        policy,
        source,
        trustedNowMs,
        digestProvider:
          this.digestProvider,
      });

    if (
      !prepared.accepted
      || !prepared.source
    ) {
      return result(
        false,
        prepared.reason,
      );
    }

    if (
      this.tombstones.has(
        source.sourceId,
      )
    ) {
      return result(
        false,
        'source_tombstoned',
      );
    }

    const activePolicy =
      this.policies.get(
        workspaceKey(
          source.accountId,
          source.workspaceId,
        ),
      );

    if (
      !activePolicy
      || !activePolicy.enabled
      || activePolicy.policyId
        !== source.policyId
      || activePolicy.revision
        !== source.policyRevision
    ) {
      return result(
        false,
        'policy_changed_during_ingestion',
      );
    }

    const incoming =
      prepared.source;
    const current =
      this.latestSources.get(
        incoming.sourceId,
      );

    let nextHistory:
      Map<
        number,
        KnowledgeSourceRevision
      >;

    if (current) {
      if (
        !immutableIdentityMatches(
          current,
          incoming,
        )
      ) {
        return result(
          false,
          'source_identity_conflict',
          current,
        );
      }

      if (
        incoming.revision
          === current.revision
      ) {
        return sameRevision(
          current,
          incoming,
        )
          ? result(
              true,
              'duplicate',
              current,
              true,
            )
          : result(
              false,
              'source_revision_conflict',
              current,
            );
      }

      if (
        incoming.revision
          < current.revision
      ) {
        return result(
          false,
          'source_revision_stale',
          current,
        );
      }

      if (
        incoming.revision
          !== current.revision + 1
      ) {
        return result(
          false,
          'source_revision_gap',
          current,
        );
      }

      const superseded =
        parseKnowledgeSourceRevision({
          ...current,
          state: 'superseded',
          supersededByRevision:
            incoming.revision,
        });

      if (!superseded) {
        return result(
          false,
          'source_supersession_invalid',
          current,
        );
      }

      nextHistory =
        new Map(
          this.sourceHistory.get(
            current.sourceId,
          )
          ?? [],
        );

      nextHistory.set(
        current.revision,
        superseded,
      );
      nextHistory.set(
        incoming.revision,
        incoming,
      );
    } else {
      if (incoming.revision !== 1) {
        return result(
          false,
          'source_revision_gap',
        );
      }

      nextHistory =
        new Map([
          [
            incoming.revision,
            incoming,
          ],
        ]);
    }

    const preparedIndex =
      this.derivedIndex.prepare(
        incoming,
        prepared.chunks,
      );

    if (!preparedIndex) {
      return result(
        false,
        'index_build_failed',
      );
    }

    const publishedIndex =
      this.derivedIndex.publish(
        preparedIndex,
      );

    if (!publishedIndex.accepted) {
      return result(
        false,
        publishedIndex.reason,
      );
    }

    this.sourceHistory.set(
      incoming.sourceId,
      nextHistory,
    );
    this.latestSources.set(
      incoming.sourceId,
      incoming,
    );
    this.bumpGeneration(
      incoming.accountId,
      incoming.workspaceId,
    );

    return result(
      true,
      'source_published',
      incoming,
    );
  }

  retire({
    accountId,
    workspaceId,
    sourceId,
    expectedRevision,
    reason,
    trustedNowMs,
  }: {
    accountId: string;
    workspaceId: string;
    sourceId: string;
    expectedRevision: number;
    reason:
      KnowledgeTombstoneReason;
    trustedNowMs: number;
  }): KnowledgeRegistryResult<
    KnowledgeTombstone
  > {
    if (
      !ACCOUNT_ID.test(accountId)
      || !WORKSPACE_ID.test(
        workspaceId,
      )
      || !KNOWLEDGE_SOURCE_ID.test(
        sourceId,
      )
      || !safeInteger(
        expectedRevision,
      )
      || expectedRevision < 1
      || !safeInteger(
        trustedNowMs,
      )
    ) {
      return result(
        false,
        'retirement_invalid',
      );
    }

    const existingTombstone =
      this.tombstones.get(
        sourceId,
      );

    if (existingTombstone) {
      if (
        existingTombstone.accountId
          === accountId
        && existingTombstone.workspaceId
          === workspaceId
        && existingTombstone
          .deletedRevision
          === expectedRevision
        && existingTombstone.reason
          === reason
      ) {
        return result(
          true,
          'duplicate',
          existingTombstone,
          true,
        );
      }

      return result(
        false,
        'retirement_conflict',
        existingTombstone,
      );
    }

    const current =
      this.latestSources.get(
        sourceId,
      );

    if (
      !current
      || current.accountId
        !== accountId
      || current.workspaceId
        !== workspaceId
    ) {
      return result(
        false,
        'source_unknown',
      );
    }

    if (
      current.revision
        !== expectedRevision
    ) {
      return result(
        false,
        'source_revision_conflict',
      );
    }

    if (
      trustedNowMs
        < current.indexedAtMs
    ) {
      return result(
        false,
        'time_rollback',
      );
    }

    const tombstone =
      parseKnowledgeTombstone({
        protocolVersion: '1.0',
        sourceId,
        accountId,
        workspaceId,
        deletedRevision:
          current.revision,
        deletedAtMs:
          trustedNowMs,
        reason,
        grantsExecutionAuthority:
          false,
        grantsSensorAuthority:
          false,
        grantsApprovalAuthority:
          false,
        grantsCapabilityAuthority:
          false,
      });

    if (!tombstone) {
      return result(
        false,
        'tombstone_invalid',
      );
    }

    const retired =
      parseKnowledgeSourceRevision({
        ...current,
        state:
          reason === 'source_revoked'
            ? 'revoked'
            : 'deleted',
        supersededByRevision:
          null,
      });

    if (!retired) {
      return result(
        false,
        'source_retirement_invalid',
      );
    }

    this.latestSources.set(
      sourceId,
      retired,
    );

    const history =
      this.sourceHistory.get(
        sourceId,
      );

    history?.set(
      retired.revision,
      retired,
    );

    this.derivedIndex.invalidate(
      sourceId,
      current.revision,
    );
    this.tombstones.set(
      sourceId,
      tombstone,
    );
    this.bumpGeneration(
      accountId,
      workspaceId,
    );

    return result(
      true,
      'source_retired',
      tombstone,
    );
  }

  retrieve(
    queryInput: unknown,
    trustedNowMs: number,
  ): KnowledgeRegistryResult<
    KnowledgeProjection
  > {
    const query =
      parseKnowledgeQuery(
        queryInput,
      );

    if (
      !query
      || !safeInteger(
        trustedNowMs,
      )
      || query.requestedAtMs
        > trustedNowMs
    ) {
      return result(
        false,
        'query_invalid',
      );
    }

    const policy =
      this.policies.get(
        workspaceKey(
          query.accountId,
          query.workspaceId,
        ),
      );

    if (
      !policy
      || !policy.enabled
    ) {
      return result(
        false,
        'knowledge_disabled',
      );
    }

    if (
      policy.policyId
        !== query.policyId
      || policy.revision
        !== query.policyRevision
    ) {
      return result(
        false,
        'policy_binding_mismatch',
      );
    }

    if (
      query.sourceKinds.some(
        (kind) =>
          !policy
            .acceptedSourceKinds
            .includes(kind),
      )
      || query.maxResults
        > policy.maxResults
      || query.maxProjectionBytes
        > policy.maxProjectionBytes
    ) {
      return result(
        false,
        'query_scope_denied',
      );
    }

    const sources =
      [...this.latestSources
        .values()]
        .filter(
          (source) =>
            source.accountId
              === query.accountId
            && source.workspaceId
              === query.workspaceId,
        );

    const chunksBySource =
      new Map<
        string,
        readonly KnowledgeChunk[]
      >(
        sources.map(
          (source) => [
            source.sourceId,
            this.derivedIndex.getChunks(
              source.sourceId,
              source.revision,
              source.contentDigest,
            ),
          ],
        ),
      );

    const candidates =
      rankKnowledgeCandidates({
        query,
        policy,
        sources,
        chunksBySource,
        trustedNowMs,
      });

    const generation =
      this.generationFor(
        query.accountId,
        query.workspaceId,
      );
    const body =
      query.queryId.replace(
        /^knowledge_query_/,
        '',
      );
    const projection =
      buildKnowledgeProjection({
        projectionId:
          'knowledge_projection_'
          + body
          + '_g'
          + String(generation),
        query,
        policy,
        generation,
        candidates,
        trustedNowMs,
      });

    if (!projection) {
      return result(
        false,
        'projection_failed',
      );
    }

    this.issuedProjections.add(
      projection,
    );

    return result(
      true,
      'retrieved',
      projection,
    );
  }

  isCurrentProjection(
    projection:
      KnowledgeProjection,
  ): boolean {
    if (
      !projection
      || typeof projection
        !== 'object'
      || !this.issuedProjections.has(
        projection,
      )
    ) {
      return false;
    }

    const policy =
      this.policies.get(
        workspaceKey(
          projection.accountId,
          projection.workspaceId,
        ),
      );

    return (
      Boolean(policy)
      && policy?.enabled === true
      && policy.policyId
        === projection.policyId
      && policy.revision
        === projection.policyRevision
      && this.generationFor(
        projection.accountId,
        projection.workspaceId,
      ) === projection.generation
    );
  }

  exportWorkspaceState(
    accountId: string,
    workspaceId: string,
  ): KnowledgeWorkspaceState | null {
    if (
      !ACCOUNT_ID.test(accountId)
      || !WORKSPACE_ID.test(
        workspaceId,
      )
    ) {
      return null;
    }

    const policy =
      this.policies.get(
        workspaceKey(
          accountId,
          workspaceId,
        ),
      );

    if (!policy) {
      return null;
    }

    const sources:
      KnowledgeSourceRevision[] = [];
    const sourceIds =
      new Set<string>();

    for (
      const [
        sourceId,
        history,
      ] of this.sourceHistory
    ) {
      const ordered =
        [...history.values()]
          .filter(
            (source) =>
              source.accountId
                === accountId
              && source.workspaceId
                === workspaceId,
          )
          .sort(
            (a, b) =>
              a.revision
                - b.revision,
          );

      if (ordered.length > 0) {
        sourceIds.add(sourceId);
        sources.push(...ordered);
      }
    }

    const chunks:
      KnowledgeChunk[] = [];

    for (const sourceId of sourceIds) {
      const latest =
        this.latestSources.get(
          sourceId,
        );
      const values =
        latest
          ? this.derivedIndex
              .getChunks(
                sourceId,
                latest.revision,
                latest.contentDigest,
              )
          : [];

      if (values.length > 0) {
        chunks.push(...values);
      }
    }

    const tombstones =
      [...this.tombstones.values()]
        .filter(
          (tombstone) =>
            tombstone.accountId
              === accountId
            && tombstone.workspaceId
              === workspaceId,
        );

    return parseKnowledgeWorkspaceState({
      protocolVersion: '1.0',
      accountId,
      workspaceId,
      generation:
        this.generationFor(
          accountId,
          workspaceId,
        ),
      policy,
      sources,
      chunks,
      tombstones,
      grantsExecutionAuthority:
        false,
      grantsSensorAuthority:
        false,
      grantsApprovalAuthority:
        false,
      grantsCapabilityAuthority:
        false,
    });
  }

  async sealSnapshot(
    accountId: string,
    workspaceId: string,
    sealedAtMs: number,
    provider:
      KnowledgeIntegrityProvider,
  ): Promise<
    SealedKnowledgeSnapshot | null
  > {
    const state =
      this.exportWorkspaceState(
        accountId,
        workspaceId,
      );

    if (!state) {
      return null;
    }

    const sealed =
      await sealKnowledgeWorkspaceState(
        state,
        sealedAtMs,
        provider,
      );

    if (!sealed) {
      return null;
    }

    const currentPolicy =
      this.policies.get(
        workspaceKey(
          accountId,
          workspaceId,
        ),
      );

    if (
      !currentPolicy
      || currentPolicy.policyId
        !== state.policy.policyId
      || currentPolicy.revision
        !== state.policy.revision
      || this.generationFor(
        accountId,
        workspaceId,
      ) !== state.generation
    ) {
      return null;
    }

    return sealed;
  }

  private restoreVerifiedState(
    state:
      KnowledgeWorkspaceState,
  ): KnowledgeRegistryResult<
    KnowledgeWorkspaceState
  > {
    const key =
      workspaceKey(
        state.accountId,
        state.workspaceId,
      );

    if (this.policies.has(key)) {
      return result(
        false,
        'workspace_state_conflict',
      );
    }

    const grouped =
      new Map<
        string,
        KnowledgeSourceRevision[]
      >();

    for (const source of state.sources) {
      if (
        this.latestSources.has(
          source.sourceId,
        )
        || this.tombstones.has(
          source.sourceId,
        )
      ) {
        return result(
          false,
          'source_identity_conflict',
        );
      }

      const group =
        grouped.get(source.sourceId)
        ?? [];

      group.push(source);
      grouped.set(
        source.sourceId,
        group,
      );
    }

    const chunksBySource =
      new Map<
        string,
        KnowledgeChunk[]
      >();

    for (const chunk of state.chunks) {
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

    const staged =
      new Map<
        string,
        Readonly<{
          history:
            Map<
              number,
              KnowledgeSourceRevision
            >;
          latest:
            KnowledgeSourceRevision;
          preparedIndex:
            PreparedKnowledgeIndex
            | null;
        }>
      >();

    for (
      const [
        sourceId,
        values,
      ] of grouped
    ) {
      if (
        this.derivedIndex
          .getEntry(sourceId)
      ) {
        return result(
          false,
          'source_identity_conflict',
        );
      }

      const ordered =
        [...values].sort(
          (a, b) =>
            a.revision - b.revision,
        );

      const history =
        new Map<
          number,
          KnowledgeSourceRevision
        >();

      for (const value of ordered) {
        history.set(
          value.revision,
          value,
        );
      }

      const latest =
        ordered[
          ordered.length - 1
        ];
      const sourceChunks =
        [
          ...(chunksBySource.get(
            sourceId,
          ) ?? []),
        ].sort(
          (a, b) =>
            a.ordinal - b.ordinal,
        );

      let preparedIndex:
        PreparedKnowledgeIndex
        | null = null;

      if (latest.state === 'active') {
        preparedIndex =
          this.derivedIndex.prepare(
            latest,
            sourceChunks,
          );

        if (!preparedIndex) {
          return result(
            false,
            'index_restore_failed',
          );
        }
      } else if (
        sourceChunks.length > 0
      ) {
        return result(
          false,
          'index_restore_failed',
        );
      }

      staged.set(
        sourceId,
        Object.freeze({
          history,
          latest,
          preparedIndex,
        }),
      );
    }

    for (
      const stagedSource of
        staged.values()
    ) {
      if (
        stagedSource.preparedIndex
      ) {
        const published =
          this.derivedIndex.publish(
            stagedSource
              .preparedIndex,
          );

        if (!published.accepted) {
          return result(
            false,
            'index_restore_failed',
          );
        }
      }
    }

    this.policies.set(
      key,
      state.policy,
    );
    this.generations.set(
      key,
      state.generation,
    );

    for (
      const [
        sourceId,
        stagedSource,
      ] of staged
    ) {
      this.sourceHistory.set(
        sourceId,
        stagedSource.history,
      );
      this.latestSources.set(
        sourceId,
        stagedSource.latest,
      );
    }

    for (
      const tombstone of
        state.tombstones
    ) {
      this.tombstones.set(
        tombstone.sourceId,
        tombstone,
      );
    }

    return result(
      true,
      'workspace_state_restored',
      state,
    );
  }

  async verifyAndRestoreSnapshot(
    input: unknown,
    provider:
      KnowledgeIntegrityProvider,
  ): Promise<
    KnowledgeRegistryResult<
      KnowledgeWorkspaceState
    >
  > {
    const snapshot =
      await verifyKnowledgeSnapshot(
        input,
        provider,
      );

    if (!snapshot) {
      return result(
        false,
        'snapshot_integrity_failed',
      );
    }

    return this.restoreVerifiedState(
      snapshot.state,
    );
  }

  getSource(
    sourceId: string,
  ): KnowledgeSourceRevision | null {
    return (
      this.latestSources.get(
        sourceId,
      )
      ?? null
    );
  }

  getChunks(
    sourceId: string,
  ): readonly KnowledgeChunk[] {
    const source =
      this.latestSources.get(
        sourceId,
      );

    if (!source) {
      return Object.freeze([]);
    }

    return this.derivedIndex
      .getChunks(
        sourceId,
        source.revision,
        source.contentDigest,
      );
  }

  getTombstone(
    sourceId: string,
  ): KnowledgeTombstone | null {
    return (
      this.tombstones.get(
        sourceId,
      )
      ?? null
    );
  }

  getPolicy(
    accountId: string,
    workspaceId: string,
  ): KnowledgePolicy | null {
    return (
      this.policies.get(
        workspaceKey(
          accountId,
          workspaceId,
        ),
      )
      ?? null
    );
  }
}
