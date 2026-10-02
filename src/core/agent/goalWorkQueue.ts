import {
  exactObject,
  safeInteger,
  safeReasonCode,
  safeReference,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
} from './goalContract';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const WORK_ID =
  new RegExp('^goal_work_' + BODY + '$');

export type GoalWorkItem =
  Readonly<{
    protocolVersion: '1.0';
    workId: string;
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    priority: number;
    sideEffect: boolean;
    idempotencyKey: string;
    notBeforeMs: number;
    deadlineAtMs: number | null;
    maxAttempts: number;
    createdAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalWorkStatus =
  | 'queued'
  | 'leased'
  | 'reconciliation_required'
  | 'completed'
  | 'dead_letter';

export type GoalWorkState =
  Readonly<{
    item: GoalWorkItem;
    status: GoalWorkStatus;
    attempt: number;
    leaseOwnerRef: string | null;
    leaseExpiresAtMs: number | null;
    eligibleAtMs: number;
    lastFailureReason: string | null;
    completionEvidenceRef: string | null;
    updatedAtMs: number;
  }>;

export type GoalWorkQueuePolicy =
  Readonly<{
    maxQueueItems: number;
    minimumLeaseMs: number;
    maximumLeaseMs: number;
    retryBaseDelayMs: number;
    retryMaxDelayMs: number;
  }>;

export type GoalWorkMutationResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'idempotent'
      | 'no_work'
      | 'invalid_input'
      | 'duplicate_conflict'
      | 'not_found'
      | 'invalid_state'
      | 'lease_owner_mismatch'
      | 'lease_expired'
      | 'attempts_exhausted'
      | 'deadline_exceeded'
      | 'reconciliation_required';
    state: GoalWorkState | null;
  }>;

const ITEM_KEYS =
  new Set([
    'protocolVersion',
    'workId',
    'goalId',
    'planId',
    'stepId',
    'operationRef',
    'priority',
    'sideEffect',
    'idempotencyKey',
    'notBeforeMs',
    'deadlineAtMs',
    'maxAttempts',
    'createdAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseGoalWorkItem(
  input: unknown,
): GoalWorkItem | null {
  const record =
    exactObject(input, ITEM_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.workId !== 'string'
    || !WORK_ID.test(record.workId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || typeof record.stepId !== 'string'
    || !GOAL_STEP_ID.test(record.stepId)
    || !safeReference(record.operationRef, 240)
    || !safeInteger(record.priority)
    || Number(record.priority) > 1000
    || typeof record.sideEffect !== 'boolean'
    || !safeReference(
      record.idempotencyKey,
      240,
    )
    || !safeInteger(record.notBeforeMs)
    || (
      record.deadlineAtMs !== null
      && (
        !safeInteger(record.deadlineAtMs)
        || Number(record.deadlineAtMs)
          <= Number(record.notBeforeMs)
      )
    )
    || !safeInteger(record.maxAttempts)
    || Number(record.maxAttempts) < 1
    || Number(record.maxAttempts) > 32
    || !safeInteger(record.createdAtMs)
    || Number(record.notBeforeMs)
      < Number(record.createdAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    workId: record.workId as string,
    goalId: record.goalId as string,
    planId: record.planId as string,
    stepId: record.stepId as string,
    operationRef: record.operationRef as string,
    priority: record.priority as number,
    sideEffect: record.sideEffect as boolean,
    idempotencyKey:
      record.idempotencyKey as string,
    notBeforeMs:
      record.notBeforeMs as number,
    deadlineAtMs:
      record.deadlineAtMs as number | null,
    maxAttempts:
      record.maxAttempts as number,
    createdAtMs:
      record.createdAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

const STATE_KEYS =
  new Set([
    'item',
    'status',
    'attempt',
    'leaseOwnerRef',
    'leaseExpiresAtMs',
    'eligibleAtMs',
    'lastFailureReason',
    'completionEvidenceRef',
    'updatedAtMs',
  ]);

export function parseGoalWorkState(
  input: unknown,
): GoalWorkState | null {
  const record =
    exactObject(input, STATE_KEYS);

  if (!record) {
    return null;
  }

  const item =
    parseGoalWorkItem(record.item);

  if (
    !item
    || typeof record.status !== 'string'
    || ![
      'queued',
      'leased',
      'reconciliation_required',
      'completed',
      'dead_letter',
    ].includes(record.status)
    || !safeInteger(record.attempt)
    || Number(record.attempt)
      > item.maxAttempts
    || (
      record.leaseOwnerRef !== null
      && !safeReference(
        record.leaseOwnerRef,
        240,
      )
    )
    || (
      record.leaseExpiresAtMs !== null
      && !safeInteger(
        record.leaseExpiresAtMs,
      )
    )
    || !safeInteger(record.eligibleAtMs)
    || Number(record.eligibleAtMs)
      < item.notBeforeMs
    || (
      record.lastFailureReason !== null
      && !safeReasonCode(
        record.lastFailureReason,
      )
    )
    || (
      record.completionEvidenceRef !== null
      && !safeReference(
        record.completionEvidenceRef,
        240,
      )
    )
    || !safeInteger(record.updatedAtMs)
    || Number(record.updatedAtMs)
      < item.createdAtMs
  ) {
    return null;
  }

  const status =
    record.status as GoalWorkStatus;
  const attempt =
    record.attempt as number;
  const leaseOwnerRef =
    record.leaseOwnerRef as string | null;
  const leaseExpiresAtMs =
    record.leaseExpiresAtMs as number | null;
  const lastFailureReason =
    record.lastFailureReason as string | null;
  const completionEvidenceRef =
    record.completionEvidenceRef as string | null;

  if (
    status === 'queued'
      ? (
          leaseOwnerRef !== null
          || leaseExpiresAtMs !== null
        )
      : status === 'leased'
        ? (
            attempt < 1
            || leaseOwnerRef === null
            || leaseExpiresAtMs === null
            || leaseExpiresAtMs
              <= Number(record.updatedAtMs)
            || lastFailureReason !== null
            || completionEvidenceRef !== null
          )
        : status
            === 'reconciliation_required'
          ? (
              !item.sideEffect
              || attempt < 1
              || leaseOwnerRef !== null
              || leaseExpiresAtMs !== null
              || lastFailureReason === null
            )
          : status === 'completed'
            ? (
                attempt < 1
                || leaseOwnerRef !== null
                || leaseExpiresAtMs !== null
                || lastFailureReason !== null
                || completionEvidenceRef === null
              )
            : (
                leaseOwnerRef !== null
                || leaseExpiresAtMs !== null
                || lastFailureReason === null
              )
  ) {
    return null;
  }

  return freezeState({
    item,
    status,
    attempt,
    leaseOwnerRef,
    leaseExpiresAtMs,
    eligibleAtMs:
      record.eligibleAtMs as number,
    lastFailureReason,
    completionEvidenceRef,
    updatedAtMs:
      record.updatedAtMs as number,
  });
}

export function validateGoalWorkQueuePolicy(
  policy: GoalWorkQueuePolicy,
): boolean {
  return (
    safeInteger(policy.maxQueueItems)
    && policy.maxQueueItems >= 1
    && policy.maxQueueItems <= 100_000
    && safeInteger(policy.minimumLeaseMs)
    && policy.minimumLeaseMs >= 1_000
    && safeInteger(policy.maximumLeaseMs)
    && policy.maximumLeaseMs
      >= policy.minimumLeaseMs
    && policy.maximumLeaseMs
      <= 60 * 60 * 1000
    && safeInteger(policy.retryBaseDelayMs)
    && policy.retryBaseDelayMs >= 1_000
    && safeInteger(policy.retryMaxDelayMs)
    && policy.retryMaxDelayMs
      >= policy.retryBaseDelayMs
    && policy.retryMaxDelayMs
      <= 24 * 60 * 60 * 1000
  );
}

function freezeState(
  value: GoalWorkState,
): GoalWorkState {
  return Object.freeze({
    ...value,
    item: value.item,
  });
}

function mutation(
  accepted: boolean,
  idempotent: boolean,
  reason: GoalWorkMutationResult['reason'],
  state: GoalWorkState | null,
): GoalWorkMutationResult {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
    state,
  });
}

function sameItem(
  left: GoalWorkItem,
  right: GoalWorkItem,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function retryDelay(
  attempt: number,
  policy: GoalWorkQueuePolicy,
): number {
  const multiplier =
    2 ** Math.min(20, Math.max(0, attempt - 1));

  return Math.min(
    policy.retryMaxDelayMs,
    policy.retryBaseDelayMs
      * multiplier,
  );
}

export class GoalWorkQueue {
  private readonly states =
    new Map<string, GoalWorkState>();

  constructor(
    private readonly policy: GoalWorkQueuePolicy,
  ) {
    if (!validateGoalWorkQueuePolicy(policy)) {
      throw new TypeError(
        'Invalid goal work queue policy.',
      );
    }
  }

  enqueue(
    input: unknown,
    trustedNowMs: number,
  ): GoalWorkMutationResult {
    const item = parseGoalWorkItem(input);

    if (
      !item
      || !safeInteger(trustedNowMs)
      || item.createdAtMs > trustedNowMs
    ) {
      return mutation(
        false,
        false,
        'invalid_input',
        null,
      );
    }

    const existing =
      this.states.get(item.workId);

    if (existing) {
      return sameItem(existing.item, item)
        ? mutation(
            true,
            true,
            'idempotent',
            existing,
          )
        : mutation(
            false,
            false,
            'duplicate_conflict',
            existing,
          );
    }

    if (
      this.states.size
        >= this.policy.maxQueueItems
    ) {
      return mutation(
        false,
        false,
        'invalid_state',
        null,
      );
    }

    const state =
      freezeState({
        item,
        status: 'queued',
        attempt: 0,
        leaseOwnerRef: null,
        leaseExpiresAtMs: null,
        eligibleAtMs: item.notBeforeMs,
        lastFailureReason: null,
        completionEvidenceRef: null,
        updatedAtMs: trustedNowMs,
      });

    this.states.set(item.workId, state);

    return mutation(
      true,
      false,
      'accepted',
      state,
    );
  }

  private setState(
    workId: string,
    state: GoalWorkState,
  ): GoalWorkState {
    const frozen = freezeState(state);
    this.states.set(workId, frozen);
    return frozen;
  }

  private expireLeases(
    trustedNowMs: number,
  ): void {
    for (
      const [workId, current]
      of this.states
    ) {
      if (
        current.status !== 'leased'
        || current.leaseExpiresAtMs === null
        || current.leaseExpiresAtMs
          > trustedNowMs
      ) {
        continue;
      }

      if (current.item.sideEffect) {
        this.setState(
          workId,
          {
            ...current,
            status:
              'reconciliation_required',
            leaseOwnerRef: null,
            leaseExpiresAtMs: null,
            lastFailureReason:
              'lease_expired_commit_unknown',
            updatedAtMs: trustedNowMs,
          },
        );
        continue;
      }

      if (
        current.attempt
          >= current.item.maxAttempts
      ) {
        this.setState(
          workId,
          {
            ...current,
            status: 'dead_letter',
            leaseOwnerRef: null,
            leaseExpiresAtMs: null,
            lastFailureReason:
              'attempts_exhausted',
            updatedAtMs: trustedNowMs,
          },
        );
        continue;
      }

      this.setState(
        workId,
        {
          ...current,
          status: 'queued',
          leaseOwnerRef: null,
          leaseExpiresAtMs: null,
          eligibleAtMs:
            trustedNowMs
            + retryDelay(
              current.attempt,
              this.policy,
            ),
          lastFailureReason:
            'lease_expired_retryable',
          updatedAtMs: trustedNowMs,
        },
      );
    }
  }

  private expireDeadlines(
    trustedNowMs: number,
  ): void {
    for (
      const [workId, current]
      of this.states
    ) {
      if (
        current.status !== 'queued'
        || current.item.deadlineAtMs === null
        || current.item.deadlineAtMs
          > trustedNowMs
      ) {
        continue;
      }

      this.setState(
        workId,
        {
          ...current,
          status: 'dead_letter',
          lastFailureReason:
            'deadline_exceeded',
          updatedAtMs: trustedNowMs,
        },
      );
    }
  }

  claimNext(
    workerRef: string,
    trustedNowMs: number,
    requestedLeaseMs: number,
  ): GoalWorkMutationResult {
    if (
      !safeReference(workerRef, 240)
      || !safeInteger(trustedNowMs)
      || !safeInteger(requestedLeaseMs)
      || requestedLeaseMs
        < this.policy.minimumLeaseMs
      || requestedLeaseMs
        > this.policy.maximumLeaseMs
    ) {
      return mutation(
        false,
        false,
        'invalid_input',
        null,
      );
    }

    this.expireLeases(trustedNowMs);
    this.expireDeadlines(trustedNowMs);

    const eligible =
      [...this.states.values()]
        .filter(
          (state) =>
            state.status === 'queued'
            && state.eligibleAtMs
              <= trustedNowMs
            && (
              state.item.deadlineAtMs
                === null
              || state.item.deadlineAtMs
                > trustedNowMs
            ),
        )
        .sort(
          (left, right) =>
            right.item.priority
              - left.item.priority
            || (
              left.item.deadlineAtMs
                ?? Number.MAX_SAFE_INTEGER
            )
              - (
                right.item.deadlineAtMs
                  ?? Number.MAX_SAFE_INTEGER
              )
            || left.item.createdAtMs
              - right.item.createdAtMs
            || left.item.workId.localeCompare(
              right.item.workId,
            ),
        );

    const current = eligible[0];

    if (!current) {
      return mutation(
        true,
        false,
        'no_work',
        null,
      );
    }

    if (
      current.attempt
        >= current.item.maxAttempts
    ) {
      const dead =
        this.setState(
          current.item.workId,
          {
            ...current,
            status: 'dead_letter',
            lastFailureReason:
              'attempts_exhausted',
            updatedAtMs: trustedNowMs,
          },
        );

      return mutation(
        false,
        false,
        'attempts_exhausted',
        dead,
      );
    }

    const desiredExpiry =
      trustedNowMs + requestedLeaseMs;
    const leaseExpiresAtMs =
      current.item.deadlineAtMs === null
        ? desiredExpiry
        : Math.min(
            desiredExpiry,
            current.item.deadlineAtMs,
          );

    if (leaseExpiresAtMs <= trustedNowMs) {
      const dead =
        this.setState(
          current.item.workId,
          {
            ...current,
            status: 'dead_letter',
            lastFailureReason:
              'deadline_exceeded',
            updatedAtMs: trustedNowMs,
          },
        );

      return mutation(
        false,
        false,
        'deadline_exceeded',
        dead,
      );
    }

    const leased =
      this.setState(
        current.item.workId,
        {
          ...current,
          status: 'leased',
          attempt: current.attempt + 1,
          leaseOwnerRef: workerRef,
          leaseExpiresAtMs,
          lastFailureReason: null,
          completionEvidenceRef: null,
          updatedAtMs: trustedNowMs,
        },
      );

    return mutation(
      true,
      false,
      'accepted',
      leased,
    );
  }

  renewLease(
    workId: string,
    workerRef: string,
    trustedNowMs: number,
    requestedLeaseMs: number,
  ): GoalWorkMutationResult {
    if (
      !WORK_ID.test(workId)
      || !safeReference(workerRef, 240)
      || !safeInteger(trustedNowMs)
      || !safeInteger(requestedLeaseMs)
      || requestedLeaseMs
        < this.policy.minimumLeaseMs
      || requestedLeaseMs
        > this.policy.maximumLeaseMs
    ) {
      return mutation(
        false,
        false,
        'invalid_input',
        null,
      );
    }

    this.expireLeases(trustedNowMs);

    const current =
      this.states.get(workId);

    if (!current) {
      return mutation(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (current.status !== 'leased') {
      return mutation(
        false,
        false,
        current.status
          === 'reconciliation_required'
          ? 'reconciliation_required'
          : 'invalid_state',
        current,
      );
    }

    if (
      current.leaseOwnerRef !== workerRef
    ) {
      return mutation(
        false,
        false,
        'lease_owner_mismatch',
        current,
      );
    }

    const desiredExpiry =
      trustedNowMs + requestedLeaseMs;
    const leaseExpiresAtMs =
      current.item.deadlineAtMs === null
        ? desiredExpiry
        : Math.min(
            desiredExpiry,
            current.item.deadlineAtMs,
          );

    if (leaseExpiresAtMs <= trustedNowMs) {
      return mutation(
        false,
        false,
        'deadline_exceeded',
        current,
      );
    }

    const renewed =
      this.setState(
        workId,
        {
          ...current,
          leaseExpiresAtMs,
          updatedAtMs: trustedNowMs,
        },
      );

    return mutation(
      true,
      false,
      'accepted',
      renewed,
    );
  }

  complete(
    workId: string,
    workerRef: string,
    evidenceRef: string,
    trustedNowMs: number,
  ): GoalWorkMutationResult {
    if (
      !WORK_ID.test(workId)
      || !safeReference(workerRef, 240)
      || !safeReference(evidenceRef, 240)
      || !safeInteger(trustedNowMs)
    ) {
      return mutation(
        false,
        false,
        'invalid_input',
        null,
      );
    }

    this.expireLeases(trustedNowMs);

    const current =
      this.states.get(workId);

    if (!current) {
      return mutation(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (current.status === 'completed') {
      return current.completionEvidenceRef
        === evidenceRef
        ? mutation(
            true,
            true,
            'idempotent',
            current,
          )
        : mutation(
            false,
            false,
            'duplicate_conflict',
            current,
          );
    }

    if (current.status !== 'leased') {
      return mutation(
        false,
        false,
        current.status
          === 'reconciliation_required'
          ? 'reconciliation_required'
          : 'invalid_state',
        current,
      );
    }

    if (
      current.leaseOwnerRef !== workerRef
    ) {
      return mutation(
        false,
        false,
        'lease_owner_mismatch',
        current,
      );
    }

    const completed =
      this.setState(
        workId,
        {
          ...current,
          status: 'completed',
          leaseOwnerRef: null,
          leaseExpiresAtMs: null,
          completionEvidenceRef:
            evidenceRef,
          lastFailureReason: null,
          updatedAtMs: trustedNowMs,
        },
      );

    return mutation(
      true,
      false,
      'accepted',
      completed,
    );
  }

  fail(
    workId: string,
    workerRef: string,
    reasonCode: string,
    retryable: boolean,
    commitState:
      | 'not_committed'
      | 'committed'
      | 'unknown',
    evidenceRef: string | null,
    trustedNowMs: number,
  ): GoalWorkMutationResult {
    if (
      !WORK_ID.test(workId)
      || !safeReference(workerRef, 240)
      || !safeReasonCode(reasonCode)
      || typeof retryable !== 'boolean'
      || ![
        'not_committed',
        'committed',
        'unknown',
      ].includes(commitState)
      || (
        evidenceRef !== null
        && !safeReference(
          evidenceRef,
          240,
        )
      )
      || !safeInteger(trustedNowMs)
    ) {
      return mutation(
        false,
        false,
        'invalid_input',
        null,
      );
    }

    this.expireLeases(trustedNowMs);

    const current =
      this.states.get(workId);

    if (!current) {
      return mutation(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (current.status !== 'leased') {
      return mutation(
        false,
        false,
        current.status
          === 'reconciliation_required'
          ? 'reconciliation_required'
          : 'invalid_state',
        current,
      );
    }

    if (
      current.leaseOwnerRef !== workerRef
    ) {
      return mutation(
        false,
        false,
        'lease_owner_mismatch',
        current,
      );
    }

    if (
      current.item.sideEffect
      && commitState !== 'not_committed'
    ) {
      const reconciliation =
        this.setState(
          workId,
          {
            ...current,
            status:
              'reconciliation_required',
            leaseOwnerRef: null,
            leaseExpiresAtMs: null,
            lastFailureReason:
              reasonCode,
            completionEvidenceRef:
              evidenceRef,
            updatedAtMs: trustedNowMs,
          },
        );

      return mutation(
        true,
        false,
        'reconciliation_required',
        reconciliation,
      );
    }

    const deadlineReached =
      current.item.deadlineAtMs !== null
      && current.item.deadlineAtMs
        <= trustedNowMs;

    if (
      !retryable
      || current.attempt
        >= current.item.maxAttempts
      || deadlineReached
    ) {
      const dead =
        this.setState(
          workId,
          {
            ...current,
            status: 'dead_letter',
            leaseOwnerRef: null,
            leaseExpiresAtMs: null,
            lastFailureReason:
              deadlineReached
                ? 'deadline_exceeded'
                : reasonCode,
            completionEvidenceRef:
              evidenceRef,
            updatedAtMs: trustedNowMs,
          },
        );

      return mutation(
        true,
        false,
        deadlineReached
          ? 'deadline_exceeded'
          : current.attempt
              >= current.item.maxAttempts
            ? 'attempts_exhausted'
            : 'accepted',
        dead,
      );
    }

    const eligibleAtMs =
      trustedNowMs
      + retryDelay(
        current.attempt,
        this.policy,
      );

    if (
      current.item.deadlineAtMs !== null
      && eligibleAtMs
        >= current.item.deadlineAtMs
    ) {
      const dead =
        this.setState(
          workId,
          {
            ...current,
            status: 'dead_letter',
            leaseOwnerRef: null,
            leaseExpiresAtMs: null,
            lastFailureReason:
              'deadline_exceeded',
            completionEvidenceRef:
              evidenceRef,
            updatedAtMs: trustedNowMs,
          },
        );

      return mutation(
        false,
        false,
        'deadline_exceeded',
        dead,
      );
    }

    const queued =
      this.setState(
        workId,
        {
          ...current,
          status: 'queued',
          leaseOwnerRef: null,
          leaseExpiresAtMs: null,
          eligibleAtMs,
          lastFailureReason:
            reasonCode,
          completionEvidenceRef:
            evidenceRef,
          updatedAtMs: trustedNowMs,
        },
      );

    return mutation(
      true,
      false,
      'accepted',
      queued,
    );
  }

  resolveReconciliation(
    workId: string,
    resolution:
      | 'completed'
      | 'retry'
      | 'dead_letter',
    evidenceRef: string,
    trustedNowMs: number,
  ): GoalWorkMutationResult {
    if (
      !WORK_ID.test(workId)
      || ![
        'completed',
        'retry',
        'dead_letter',
      ].includes(resolution)
      || !safeReference(evidenceRef, 240)
      || !safeInteger(trustedNowMs)
    ) {
      return mutation(
        false,
        false,
        'invalid_input',
        null,
      );
    }

    const current =
      this.states.get(workId);

    if (!current) {
      return mutation(
        false,
        false,
        'not_found',
        null,
      );
    }

    if (
      current.status
        !== 'reconciliation_required'
    ) {
      return mutation(
        false,
        false,
        'invalid_state',
        current,
      );
    }

    if (resolution === 'completed') {
      const completed =
        this.setState(
          workId,
          {
            ...current,
            status: 'completed',
            completionEvidenceRef:
              evidenceRef,
            lastFailureReason: null,
            updatedAtMs: trustedNowMs,
          },
        );

      return mutation(
        true,
        false,
        'accepted',
        completed,
      );
    }

    if (resolution === 'dead_letter') {
      const dead =
        this.setState(
          workId,
          {
            ...current,
            status: 'dead_letter',
            completionEvidenceRef:
              evidenceRef,
            updatedAtMs: trustedNowMs,
          },
        );

      return mutation(
        true,
        false,
        'accepted',
        dead,
      );
    }

    if (
      current.attempt
        >= current.item.maxAttempts
    ) {
      return mutation(
        false,
        false,
        'attempts_exhausted',
        current,
      );
    }

    if (
      current.item.deadlineAtMs !== null
      && current.item.deadlineAtMs
        <= trustedNowMs
    ) {
      return mutation(
        false,
        false,
        'deadline_exceeded',
        current,
      );
    }

    const queued =
      this.setState(
        workId,
        {
          ...current,
          status: 'queued',
          eligibleAtMs:
            trustedNowMs
            + retryDelay(
              current.attempt,
              this.policy,
            ),
          completionEvidenceRef:
            evidenceRef,
          lastFailureReason:
            'reconciliation_retry_approved',
          updatedAtMs: trustedNowMs,
        },
      );

    return mutation(
      true,
      false,
      'accepted',
      queued,
    );
  }

  restore(
    stateInputs: readonly unknown[],
    trustedNowMs: number,
  ): Readonly<{
    accepted: boolean;
    reason:
      | 'restored'
      | 'not_pristine'
      | 'invalid_snapshot';
    restoredCount: number;
  }> {
    if (this.states.size !== 0) {
      return Object.freeze({
        accepted: false,
        reason: 'not_pristine',
        restoredCount: 0,
      });
    }

    if (
      !Array.isArray(stateInputs)
      || stateInputs.length
        > this.policy.maxQueueItems
      || !safeInteger(trustedNowMs)
    ) {
      return Object.freeze({
        accepted: false,
        reason: 'invalid_snapshot',
        restoredCount: 0,
      });
    }

    const parsed: GoalWorkState[] = [];
    const ids = new Set<string>();

    for (const input of stateInputs) {
      const state =
        parseGoalWorkState(input);

      if (
        !state
        || ids.has(state.item.workId)
        || state.updatedAtMs > trustedNowMs
      ) {
        return Object.freeze({
          accepted: false,
          reason: 'invalid_snapshot',
          restoredCount: 0,
        });
      }

      ids.add(state.item.workId);
      parsed.push(state);
    }

    for (const state of parsed) {
      this.states.set(
        state.item.workId,
        state,
      );
    }

    this.expireLeases(trustedNowMs);
    this.expireDeadlines(trustedNowMs);

    return Object.freeze({
      accepted: true,
      reason: 'restored',
      restoredCount: parsed.length,
    });
  }

  getState(
    workId: string,
    trustedNowMs: number,
  ): GoalWorkState | null {
    if (
      !WORK_ID.test(workId)
      || !safeInteger(trustedNowMs)
    ) {
      return null;
    }

    this.expireLeases(trustedNowMs);
    this.expireDeadlines(trustedNowMs);

    return this.states.get(workId) ?? null;
  }

  snapshot(
    trustedNowMs: number,
  ): readonly GoalWorkState[] {
    if (!safeInteger(trustedNowMs)) {
      return Object.freeze([]);
    }

    this.expireLeases(trustedNowMs);
    this.expireDeadlines(trustedNowMs);

    return Object.freeze(
      [...this.states.values()]
        .sort(
          (left, right) =>
            left.item.createdAtMs
              - right.item.createdAtMs
            || left.item.workId.localeCompare(
              right.item.workId,
            ),
        ),
    );
  }
}

export const DEFAULT_GOAL_WORK_QUEUE_POLICY =
  Object.freeze({
    maxQueueItems: 10_000,
    minimumLeaseMs: 5_000,
    maximumLeaseMs: 5 * 60 * 1000,
    retryBaseDelayMs: 1_000,
    retryMaxDelayMs: 5 * 60 * 1000,
  } satisfies GoalWorkQueuePolicy);
