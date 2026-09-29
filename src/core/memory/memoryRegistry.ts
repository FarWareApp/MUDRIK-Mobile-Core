import {
  parseMemoryCandidate,
} from './memoryCandidate';

import {
  compactMemories,
  type MemoryCompactionProjection,
} from './memoryCompaction';

import {
  parseMemoryPolicy,
  type MemoryPolicy,
} from './memoryPolicy';

import {
  isMemoryRecordActive,
  parseMemoryRecord,
  type MemoryRecord,
} from './memoryRecord';

import {
  parseMemoryRetrievalRequest,
  retrieveMemories,
  type MemoryRetrievalDecision,
  type MemoryRetrievalProjection,
} from './memoryRetrieval';

import {
  createMemoryReconstruction,
  type MemoryReconstruction,
} from './memoryReconstruction';

import {
  parseMemoryTombstone,
  type MemoryDeletionReason,
  type MemoryTombstone,
} from './memoryTombstone';

import {
  isVerifiedMemoryDurableSnapshot,
  parseMemoryDurableSnapshot,
  sealMemoryRegistryState,
  verifyMemoryDurableSnapshot,
  type MemoryDurableSnapshot,
  type MemoryIntegrityProvider,
  type MemoryRegistryState,
} from './memoryRepository';

import {
  authorizeMemoryWrite,
} from './memoryWritePolicy';

import {
  ACCOUNT_ID,
  MEMORY_ID,
  safeInteger,
} from './memorySecurity';

export type MemoryMutationResult =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason: string;
    record: MemoryRecord | null;
    tombstone:
      MemoryTombstone | null;
  }>;

export type MemoryRestoreResult =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason: string;
  }>;

function result(
  accepted: boolean,
  duplicate: boolean,
  reason: string,
  record: MemoryRecord | null = null,
  tombstone:
    MemoryTombstone | null = null,
): MemoryMutationResult {
  return Object.freeze({
    accepted,
    duplicate,
    reason,
    record,
    tombstone,
  });
}

function same(
  left: unknown,
  right: unknown,
): boolean {
  return (
    JSON.stringify(left)
      === JSON.stringify(right)
  );
}

export class MemoryRegistry {
  private readonly policies =
    new Map<string, MemoryPolicy>();

  private readonly records =
    new Map<string, MemoryRecord>();

  private readonly tombstones =
    new Map<string, MemoryTombstone>();

  private readonly candidateToMemory =
    new Map<string, string>();

  private readonly candidateAccounts =
    new Map<string, string>();

  private readonly stateRevisions =
    new Map<string, number>();

  private readonly snapshotDigests =
    new Map<string, string>();

  private readonly projectionRevisions =
    new WeakMap<
      object,
      Readonly<{
        accountId: string;
        stateRevision: number;
      }>
    >();

  private readonly compactionRevisions =
    new WeakMap<
      object,
      Readonly<{
        accountId: string;
        stateRevision: number;
      }>
    >();

  private bumpState(
    accountId: string,
  ): void {
    const current =
      this.stateRevisions.get(
        accountId,
      ) ?? 0;

    this.stateRevisions.set(
      accountId,
      current + 1,
    );
    this.snapshotDigests.delete(
      accountId,
    );
  }

  setPolicy(
    input: unknown,
  ): MemoryMutationResult {
    const policy =
      parseMemoryPolicy(input);

    if (!policy) {
      return result(
        false,
        false,
        'invalid_policy',
      );
    }

    const current =
      this.policies.get(
        policy.accountId,
      );

    if (!current) {
      this.policies.set(
        policy.accountId,
        policy,
      );
      this.bumpState(
        policy.accountId,
      );

      return result(
        true,
        false,
        'accepted',
      );
    }

    if (
      current.policyId
        !== policy.policyId
    ) {
      return result(
        false,
        false,
        'policy_identity_conflict',
      );
    }

    if (
      policy.revision
        < current.revision
    ) {
      return result(
        false,
        false,
        'stale_policy',
      );
    }

    if (
      policy.revision
        === current.revision
    ) {
      return same(
        current,
        policy,
      )
        ? result(
            true,
            true,
            'duplicate',
          )
        : result(
            false,
            false,
            'policy_revision_conflict',
          );
    }

    if (
      policy.revision
        !== current.revision + 1
      || policy.updatedAtMs
        < current.updatedAtMs
    ) {
      return result(
        false,
        false,
        'policy_revision_gap',
      );
    }

    this.policies.set(
      policy.accountId,
      policy,
    );
    this.bumpState(
      policy.accountId,
    );

    return result(
      true,
      false,
      'accepted',
    );
  }

  create(
    input: {
      candidate: unknown;
      approval: unknown;
      memoryId: string;
      trustedNowMs: number;
    },
  ): MemoryMutationResult {
    const candidate =
      parseMemoryCandidate(
        input.candidate,
      );

    if (
      !candidate
      || !MEMORY_ID.test(
        input.memoryId,
      )
      || !safeInteger(
        input.trustedNowMs,
      )
    ) {
      return result(
        false,
        false,
        'invalid_input',
      );
    }

    const usedMemoryId =
      this.candidateToMemory.get(
        candidate.candidateId,
      );

    if (usedMemoryId) {
      if (
        usedMemoryId
          === input.memoryId
      ) {
        const existing =
          this.records.get(
            usedMemoryId,
          )
          ?? null;

        return result(
          true,
          true,
          'duplicate',
          existing,
          this.tombstones.get(
            usedMemoryId,
          )
            ?? null,
        );
      }

      return result(
        false,
        false,
        'candidate_replay',
      );
    }

    if (
      this.records.has(
        input.memoryId,
      )
    ) {
      return result(
        false,
        false,
        'memory_id_conflict',
      );
    }

    if (
      this.tombstones.has(
        input.memoryId,
      )
    ) {
      return result(
        false,
        false,
        'memory_id_tombstoned',
      );
    }

    const policy =
      this.policies.get(
        candidate.accountId,
      );

    if (!policy) {
      return result(
        false,
        false,
        'policy_missing',
      );
    }

    const decision =
      authorizeMemoryWrite({
        policy,
        candidate,
        approval:
          input.approval,
        memoryId:
          input.memoryId,
        trustedNowMs:
          input.trustedNowMs,
      });

    if (
      !decision.accepted
      || !decision.record
    ) {
      return result(
        false,
        false,
        decision.reason,
      );
    }

    this.records.set(
      input.memoryId,
      decision.record,
    );

    this.candidateToMemory.set(
      candidate.candidateId,
      input.memoryId,
    );
    this.candidateAccounts.set(
      candidate.candidateId,
      candidate.accountId,
    );
    this.bumpState(
      candidate.accountId,
    );

    return result(
      true,
      false,
      'accepted',
      decision.record,
    );
  }

  delete(
    input: {
      accountId: string;
      memoryId: string;
      expectedRevision: number;
      reason:
        MemoryDeletionReason;
      trustedNowMs: number;
    },
  ): MemoryMutationResult {
    if (
      !ACCOUNT_ID.test(
        input.accountId,
      )
      || !MEMORY_ID.test(
        input.memoryId,
      )
      || !safeInteger(
        input.expectedRevision,
      )
      || input.expectedRevision < 1
      || !safeInteger(
        input.trustedNowMs,
      )
    ) {
      return result(
        false,
        false,
        'invalid_input',
      );
    }

    const existingTombstone =
      this.tombstones.get(
        input.memoryId,
      );

    if (existingTombstone) {
      if (
        existingTombstone.accountId
          === input.accountId
        && existingTombstone
          .deletedRevision
          === input.expectedRevision
        && existingTombstone.reason
          === input.reason
      ) {
        return result(
          true,
          true,
          'duplicate',
          null,
          existingTombstone,
        );
      }

      return result(
        false,
        false,
        'delete_conflict',
      );
    }

    const record =
      this.records.get(
        input.memoryId,
      );

    if (!record) {
      return result(
        false,
        false,
        'memory_not_found',
      );
    }

    if (
      record.accountId
        !== input.accountId
    ) {
      return result(
        false,
        false,
        'binding_mismatch',
      );
    }

    if (
      record.revision
        !== input.expectedRevision
    ) {
      return result(
        false,
        false,
        'revision_conflict',
      );
    }

    if (
      input.trustedNowMs
        < record.updatedAtMs
    ) {
      return result(
        false,
        false,
        'time_invalid',
      );
    }

    const tombstone =
      parseMemoryTombstone({
        protocolVersion: '1.0',
        memoryId:
          record.memoryId,
        accountId:
          record.accountId,
        deletedRevision:
          record.revision,
        deletedAtMs:
          input.trustedNowMs,
        reason:
          input.reason,
        grantsExecutionAuthority:
          false,
        grantsSensorAuthority:
          false,
        grantsToolAuthority:
          false,
      });

    if (!tombstone) {
      return result(
        false,
        false,
        'invalid_tombstone',
      );
    }

    this.records.delete(
      input.memoryId,
    );
    this.tombstones.set(
      input.memoryId,
      tombstone,
    );
    this.bumpState(
      input.accountId,
    );

    return result(
      true,
      false,
      'deleted',
      null,
      tombstone,
    );
  }

  supersede(
    input: {
      accountId: string;
      currentMemoryId: string;
      expectedRevision: number;
      candidate: unknown;
      approval: unknown;
      newMemoryId: string;
      trustedNowMs: number;
    },
  ): MemoryMutationResult {
    const current =
      this.records.get(
        input.currentMemoryId,
      );
    const nextCandidate =
      parseMemoryCandidate(
        input.candidate,
      );

    if (
      !current
      || !nextCandidate
      || current.accountId
        !== input.accountId
      || current.revision
        !== input.expectedRevision
      || !isMemoryRecordActive(
        current,
        input.trustedNowMs,
      )
    ) {
      return result(
        false,
        false,
        'supersession_source_invalid',
      );
    }

    if (
      nextCandidate.accountId
        !== current.accountId
      || nextCandidate.category
        !== current.category
    ) {
      return result(
        false,
        false,
        'supersession_binding_mismatch',
      );
    }

    const preparedSuperseded =
      parseMemoryRecord({
        ...current,
        revision:
          current.revision + 1,
        updatedAtMs:
          input.trustedNowMs,
        state: 'superseded',
        supersededByMemoryId:
          input.newMemoryId,
      });

    if (!preparedSuperseded) {
      return result(
        false,
        false,
        'supersession_invalid',
      );
    }

    const created =
      this.create({
        candidate:
          input.candidate,
        approval:
          input.approval,
        memoryId:
          input.newMemoryId,
        trustedNowMs:
          input.trustedNowMs,
      });

    if (
      !created.accepted
      || created.duplicate
      || !created.record
    ) {
      return result(
        false,
        false,
        created.reason,
      );
    }

    this.records.set(
      current.memoryId,
      preparedSuperseded,
    );

    return result(
      true,
      false,
      'superseded',
      created.record,
    );
  }

  async sealSnapshot(
    accountId: string,
    writtenAtMs: number,
    integrityProvider:
      MemoryIntegrityProvider,
  ): Promise<
    MemoryDurableSnapshot | null
  > {
    if (
      !ACCOUNT_ID.test(accountId)
      || !safeInteger(writtenAtMs)
    ) {
      return null;
    }

    const state =
      this.exportAccountState(
        accountId,
      );

    if (!state) {
      return null;
    }

    return sealMemoryRegistryState(
      state,
      writtenAtMs,
      integrityProvider,
    );
  }

  async verifyAndRestoreSnapshot(
    input: unknown,
    integrityProvider:
      MemoryIntegrityProvider,
  ): Promise<MemoryRestoreResult> {
    const verified =
      await verifyMemoryDurableSnapshot(
        input,
        integrityProvider,
      );

    if (!verified) {
      return Object.freeze({
        accepted: false,
        duplicate: false,
        reason:
          'snapshot_integrity_failed',
      });
    }

    return this.restoreSnapshot(
      verified,
    );
  }

  restoreSnapshot(
    input: unknown,
  ): MemoryRestoreResult {
    if (
      !isVerifiedMemoryDurableSnapshot(
        input,
      )
    ) {
      return Object.freeze({
        accepted: false,
        duplicate: false,
        reason: 'snapshot_unverified',
      });
    }

    const snapshot =
      parseMemoryDurableSnapshot(
        input,
      );

    if (!snapshot) {
      return Object.freeze({
        accepted: false,
        duplicate: false,
        reason: 'invalid_snapshot',
      });
    }

    const currentRevision =
      this.stateRevisions.get(
        snapshot.accountId,
      );

    if (
      currentRevision !== undefined
    ) {
      if (
        snapshot.snapshotRevision
          < currentRevision
      ) {
        return Object.freeze({
          accepted: false,
          duplicate: false,
          reason: 'stale_snapshot',
        });
      }

      if (
        snapshot.snapshotRevision
          === currentRevision
      ) {
        const duplicate =
          this.snapshotDigests.get(
            snapshot.accountId,
          )
          === snapshot.integrityDigest;

        return Object.freeze({
          accepted: duplicate,
          duplicate,
          reason:
            duplicate
              ? 'duplicate'
              : 'snapshot_revision_conflict',
        });
      }

      if (
        snapshot.snapshotRevision
          !== currentRevision + 1
      ) {
        return Object.freeze({
          accepted: false,
          duplicate: false,
          reason: 'snapshot_revision_gap',
        });
      }
    }

    for (
      const [
        memoryId,
        record,
      ] of this.records
    ) {
      if (
        record.accountId
          === snapshot.accountId
      ) {
        this.records.delete(
          memoryId,
        );
      }
    }

    for (
      const [
        memoryId,
        tombstone,
      ] of this.tombstones
    ) {
      if (
        tombstone.accountId
          === snapshot.accountId
      ) {
        this.tombstones.delete(
          memoryId,
        );
      }
    }

    for (
      const [
        candidateId,
        accountId,
      ] of this.candidateAccounts
    ) {
      if (
        accountId
          === snapshot.accountId
      ) {
        this.candidateAccounts.delete(
          candidateId,
        );
        this.candidateToMemory.delete(
          candidateId,
        );
      }
    }

    this.policies.set(
      snapshot.accountId,
      snapshot.policy,
    );

    for (
      const record of snapshot.records
    ) {
      this.records.set(
        record.memoryId,
        record,
      );
    }

    for (
      const tombstone of
        snapshot.tombstones
    ) {
      this.tombstones.set(
        tombstone.memoryId,
        tombstone,
      );
    }

    for (
      const binding of
        snapshot.candidateBindings
    ) {
      this.candidateToMemory.set(
        binding.candidateId,
        binding.memoryId,
      );
      this.candidateAccounts.set(
        binding.candidateId,
        snapshot.accountId,
      );
    }

    this.stateRevisions.set(
      snapshot.accountId,
      snapshot.snapshotRevision,
    );
    this.snapshotDigests.set(
      snapshot.accountId,
      snapshot.integrityDigest,
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      reason: 'restored',
    });
  }

  exportAccountState(
    accountId: string,
  ): MemoryRegistryState | null {
    if (!ACCOUNT_ID.test(accountId)) {
      return null;
    }

    const policy =
      this.policies.get(accountId);
    const snapshotRevision =
      this.stateRevisions.get(
        accountId,
      );

    if (
      !policy
      || snapshotRevision === undefined
      || snapshotRevision < 1
    ) {
      return null;
    }

    const records =
      [...this.records.values()]
        .filter(
          (record) =>
            record.accountId
              === accountId,
        )
        .sort(
          (left, right) =>
            left.memoryId.localeCompare(
              right.memoryId,
            ),
        );

    const tombstones =
      [...this.tombstones.values()]
        .filter(
          (tombstone) =>
            tombstone.accountId
              === accountId,
        )
        .sort(
          (left, right) =>
            left.memoryId.localeCompare(
              right.memoryId,
            ),
        );

    const candidateBindings =
      [...this.candidateAccounts.entries()]
        .filter(
          ([, owner]) =>
            owner === accountId,
        )
        .map(
          ([candidateId]) =>
            Object.freeze({
              candidateId,
              memoryId:
                this.candidateToMemory.get(
                  candidateId,
                ) as string,
            }),
        )
        .sort(
          (left, right) =>
            left.candidateId.localeCompare(
              right.candidateId,
            ),
        );

    const knownMemoryIds =
      new Set([
        ...records.map(
          (record) =>
            record.memoryId,
        ),
        ...tombstones.map(
          (tombstone) =>
            tombstone.memoryId,
        ),
      ]);

    if (
      candidateBindings.length
        !== knownMemoryIds.size
      || candidateBindings.some(
        (binding) =>
          !knownMemoryIds.has(
            binding.memoryId,
          ),
      )
    ) {
      return null;
    }

    return Object.freeze({
      accountId,
      snapshotRevision,
      policy,
      records:
        Object.freeze(records),
      tombstones:
        Object.freeze(tombstones),
      candidateBindings:
        Object.freeze(
          candidateBindings,
        ),
    });
  }

  compact(
    input: {
      accountId: string;
      maxGroups: number;
      maxBytes: number;
      trustedNowMs: number;
    },
  ): MemoryCompactionProjection | null {
    if (
      !ACCOUNT_ID.test(
        input.accountId,
      )
    ) {
      return null;
    }

    const policy =
      this.policies.get(
        input.accountId,
      );
    const stateRevision =
      this.stateRevisions.get(
        input.accountId,
      );

    if (
      !policy
      || stateRevision === undefined
      || stateRevision < 1
    ) {
      return null;
    }

    const projection =
      compactMemories({
        policy,
        records: [
          ...this.records.values(),
        ],
        request: {
          accountId:
            input.accountId,
          maxGroups:
            input.maxGroups,
          maxBytes:
            input.maxBytes,
          trustedNowMs:
            input.trustedNowMs,
        },
      });

    if (!projection) {
      return null;
    }

    this.compactionRevisions.set(
      projection as object,
      Object.freeze({
        accountId:
          input.accountId,
        stateRevision,
      }),
    );

    return projection;
  }

  isCurrentDerivedProjection(
    accountId: string,
    projection: object,
  ): boolean {
    if (!ACCOUNT_ID.test(accountId)) {
      return false;
    }

    const currentRevision =
      this.stateRevisions.get(
        accountId,
      );
    const provenance =
      this.projectionRevisions.get(
        projection,
      )
      ?? this.compactionRevisions.get(
        projection,
      );

    return (
      currentRevision !== undefined
      && provenance !== undefined
      && provenance.accountId
        === accountId
      && provenance.stateRevision
        === currentRevision
    );
  }

  retrieve(
    requestInput: unknown,
    trustedNowMs: number,
  ): MemoryRetrievalDecision {
    const request =
      parseMemoryRetrievalRequest(
        requestInput,
      );

    if (!request) {
      return Object.freeze({
        accepted: false,
        reason: 'invalid_input',
        projection: null,
      });
    }

    const policy =
      this.policies.get(
        request.accountId,
      );

    if (!policy) {
      return Object.freeze({
        accepted: false,
        reason: 'binding_mismatch',
        projection: null,
      });
    }

    const decision =
      retrieveMemories({
        policy,
        request,
        records: [
          ...this.records.values(),
        ],
        trustedNowMs,
      });

    if (
      decision.accepted
      && decision.projection
    ) {
      const stateRevision =
        this.stateRevisions.get(
          request.accountId,
        );

      if (
        stateRevision === undefined
        || stateRevision < 1
      ) {
        return Object.freeze({
          accepted: false,
          reason: 'binding_mismatch',
          projection: null,
        });
      }

      this.projectionRevisions.set(
        decision.projection as object,
        Object.freeze({
          accountId:
            request.accountId,
          stateRevision,
        }),
      );
    }

    return decision;
  }

  reconstruct(
    input: {
      accountId: string;
      conversationId: string;
      transcript: unknown;
      ephemeralContext: unknown;
      memoryProjection:
        MemoryRetrievalProjection | null;
      generatedAtMs: number;
      maxBytes: number;
    },
  ): MemoryReconstruction | null {
    if (
      !ACCOUNT_ID.test(
        input.accountId,
      )
    ) {
      return null;
    }

    if (
      input.memoryProjection
        !== null
    ) {
      if (
        !this.isCurrentDerivedProjection(
          input.accountId,
          input.memoryProjection as object,
        )
      ) {
        return null;
      }
    }

    return createMemoryReconstruction({
      accountId:
        input.accountId,
      conversationId:
        input.conversationId,
      transcript:
        input.transcript,
      ephemeralContext:
        input.ephemeralContext,
      memoryProjection:
        input.memoryProjection,
      generatedAtMs:
        input.generatedAtMs,
      maxBytes:
        input.maxBytes,
    });
  }

  purgeExpired(
    accountId: string,
    trustedNowMs: number,
  ): number {
    if (
      !ACCOUNT_ID.test(accountId)
      || !safeInteger(
        trustedNowMs,
      )
    ) {
      return 0;
    }

    const expired =
      [...this.records.values()]
        .filter(
          (record) =>
            record.accountId
              === accountId
            && record.expiresAtMs
              !== null
            && record.expiresAtMs
              <= trustedNowMs,
        );

    let deleted = 0;

    for (const record of expired) {
      const resultValue =
        this.delete({
          accountId,
          memoryId:
            record.memoryId,
          expectedRevision:
            record.revision,
          reason:
            'retention_expired',
          trustedNowMs,
        });

      if (resultValue.accepted) {
        deleted += 1;
      }
    }

    return deleted;
  }

  getTombstone(
    memoryId: string,
  ): MemoryTombstone | null {
    return (
      this.tombstones.get(
        memoryId,
      )
      ?? null
    );
  }
}
