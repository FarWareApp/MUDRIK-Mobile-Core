import {
  exactObject,
  safeInteger,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
  parseGoalExecutionSpec,
} from './goalContract';

import {
  parseGoalExecutionPlan,
} from './goalPlan';

import {
  parseResumableGoalExecutionState,
  type GoalExecutionState,
} from './goalLifecycle';

import {
  parseGoalExecutionReceipt,
  type GoalExecutionReceipt,
} from './goalExecutionReceipt';

import {
  parseGoalRollbackState,
  type GoalRollbackState,
} from './goalRollback';

import type {
  GoalCommittedReservation,
  GoalResourceUsage,
} from './goalResourceBudget';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

export const GOAL_CHECKPOINT_ID =
  new RegExp(
    '^goal_checkpoint_' + BODY + '$',
  );

export type GoalCheckpointGeneration =
  Readonly<{
    stepId: string;
    generation: number;
  }>;

export type GoalExecutionCheckpoint =
  Readonly<{
    protocolVersion: '1.0';
    checkpointId: string;
    goalId: string;
    planId: string;
    sequence: number;
    previousCheckpointId: string | null;
    replanGeneration: number;
    executionState: GoalExecutionState;
    committedUsage: GoalResourceUsage;
    committedReservations:
      readonly GoalCommittedReservation[];
    receipts: readonly GoalExecutionReceipt[];
    rollbacks: readonly GoalRollbackState[];
    lastGenerations:
      readonly GoalCheckpointGeneration[];
    createdAtMs: number;
    expiresAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type GoalCheckpointTrustAnchor =
  Readonly<{
    checkpointId: string;
    sequence: number;
  }>;

const CHECKPOINT_KEYS =
  new Set([
    'protocolVersion',
    'checkpointId',
    'goalId',
    'planId',
    'sequence',
    'previousCheckpointId',
    'replanGeneration',
    'executionState',
    'committedUsage',
    'committedReservations',
    'receipts',
    'rollbacks',
    'lastGenerations',
    'createdAtMs',
    'expiresAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

const USAGE_KEYS =
  new Set([
    'modelCalls',
    'providerCostMicros',
    'networkRequests',
    'outputBytes',
    'concurrentOperations',
  ]);

const RESERVATION_KEYS =
  new Set([
    'reservationId',
    'usage',
  ]);

const GENERATION_KEYS =
  new Set([
    'stepId',
    'generation',
  ]);

const RESERVATION_ID =
  /^goal_budget_reservation_[a-z0-9][a-z0-9_-]{15,127}$/;

function parseUsage(
  input: unknown,
): GoalResourceUsage | null {
  const record =
    exactObject(input, USAGE_KEYS);

  if (
    !record
    || !safeInteger(record.modelCalls)
    || !safeInteger(
      record.providerCostMicros,
    )
    || !safeInteger(
      record.networkRequests,
    )
    || !safeInteger(record.outputBytes)
    || !safeInteger(
      record.concurrentOperations,
    )
  ) {
    return null;
  }

  return Object.freeze({
    modelCalls: record.modelCalls as number,
    providerCostMicros:
      record.providerCostMicros as number,
    networkRequests:
      record.networkRequests as number,
    outputBytes:
      record.outputBytes as number,
    concurrentOperations:
      record.concurrentOperations as number,
  });
}

function addUsage(
  left: GoalResourceUsage,
  right: GoalResourceUsage,
): GoalResourceUsage | null {
  const value = {
    modelCalls:
      left.modelCalls + right.modelCalls,
    providerCostMicros:
      left.providerCostMicros
      + right.providerCostMicros,
    networkRequests:
      left.networkRequests
      + right.networkRequests,
    outputBytes:
      left.outputBytes + right.outputBytes,
    concurrentOperations:
      left.concurrentOperations
      + right.concurrentOperations,
  };

  return Object.values(value)
    .every(Number.isSafeInteger)
    ? Object.freeze(value)
    : null;
}

function sameUsage(
  left: GoalResourceUsage,
  right: GoalResourceUsage,
): boolean {
  return (
    left.modelCalls === right.modelCalls
    && left.providerCostMicros
      === right.providerCostMicros
    && left.networkRequests
      === right.networkRequests
    && left.outputBytes === right.outputBytes
    && left.concurrentOperations
      === right.concurrentOperations
  );
}

function parseCommittedReservations(
  input: unknown,
): readonly GoalCommittedReservation[] | null {
  if (
    !Array.isArray(input)
    || input.length > 100_000
  ) {
    return null;
  }

  const output: GoalCommittedReservation[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const record =
      exactObject(raw, RESERVATION_KEYS);

    if (
      !record
      || typeof record.reservationId !== 'string'
      || !RESERVATION_ID.test(
        record.reservationId,
      )
      || seen.has(record.reservationId)
    ) {
      return null;
    }

    const usage = parseUsage(record.usage);

    if (
      !usage
      || usage.concurrentOperations !== 0
    ) {
      return null;
    }

    seen.add(record.reservationId);
    output.push(
      Object.freeze({
        reservationId:
          record.reservationId,
        usage,
      }),
    );
  }

  return Object.freeze(output);
}

function parseGenerations(
  input: unknown,
  currentPlanStepIds: ReadonlySet<string>,
): readonly GoalCheckpointGeneration[] | null {
  if (
    !Array.isArray(input)
    || input.length > 64
  ) {
    return null;
  }

  const output: GoalCheckpointGeneration[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const record =
      exactObject(raw, GENERATION_KEYS);

    if (
      !record
      || typeof record.stepId !== 'string'
      || !GOAL_STEP_ID.test(record.stepId)
      || !currentPlanStepIds.has(record.stepId)
      || seen.has(record.stepId)
      || !safeInteger(record.generation)
      || Number(record.generation) > 1_000_000
    ) {
      return null;
    }

    seen.add(record.stepId);
    output.push(
      Object.freeze({
        stepId: record.stepId,
        generation:
          record.generation as number,
      }),
    );
  }

  return Object.freeze(output);
}

function parseReceipts(
  input: unknown,
  goalId: string,
  checkpointTimeMs: number,
): readonly GoalExecutionReceipt[] | null {
  if (
    !Array.isArray(input)
    || input.length > 10_000
  ) {
    return null;
  }

  const output: GoalExecutionReceipt[] = [];
  const receiptIds = new Set<string>();
  const leaseIds = new Set<string>();
  const attemptKeys = new Set<string>();

  for (const raw of input) {
    const receipt =
      parseGoalExecutionReceipt(raw);

    if (
      !receipt
      || receipt.goalId !== goalId
      || receipt.completedAtMs
        > checkpointTimeMs
      || receiptIds.has(receipt.receiptId)
      || leaseIds.has(receipt.leaseId)
    ) {
      return null;
    }

    const attemptKey =
      [
        receipt.goalId,
        receipt.planId,
        receipt.stepId,
        receipt.generation,
        receipt.attempt,
      ].join(':');

    if (attemptKeys.has(attemptKey)) {
      return null;
    }

    receiptIds.add(receipt.receiptId);
    leaseIds.add(receipt.leaseId);
    attemptKeys.add(attemptKey);
    output.push(receipt);
  }

  return Object.freeze(output);
}

function parseRollbacks(
  input: unknown,
  goalId: string,
  checkpointTimeMs: number,
  receiptLeaseIds: ReadonlySet<string>,
): readonly GoalRollbackState[] | null {
  if (
    !Array.isArray(input)
    || input.length > 10_000
  ) {
    return null;
  }

  const output: GoalRollbackState[] = [];
  const rollbackIds = new Set<string>();
  const leaseIds = new Set<string>();

  for (const raw of input) {
    const state =
      parseGoalRollbackState(raw);

    if (
      !state
      || state.registration.goalId !== goalId
      || !['armed', 'resolved']
        .includes(state.status)
      || state.updatedAtMs > checkpointTimeMs
      || !receiptLeaseIds.has(
        state.registration.sourceLeaseId,
      )
      || rollbackIds.has(
        state.registration.rollbackId,
      )
      || leaseIds.has(
        state.registration.sourceLeaseId,
      )
    ) {
      return null;
    }

    rollbackIds.add(
      state.registration.rollbackId,
    );
    leaseIds.add(
      state.registration.sourceLeaseId,
    );
    output.push(state);
  }

  return Object.freeze(output);
}

export function parseGoalExecutionCheckpoint(
  input: unknown,
  goalInput: unknown,
  planInput: unknown,
  trustedNowMs: number,
): GoalExecutionCheckpoint | null {
  const record =
    exactObject(input, CHECKPOINT_KEYS);
  const goal =
    parseGoalExecutionSpec(goalInput);
  const plan =
    parseGoalExecutionPlan(planInput);

  if (
    !record
    || !goal
    || !plan
    || !safeInteger(trustedNowMs)
    || record.protocolVersion !== '1.0'
    || typeof record.checkpointId !== 'string'
    || !GOAL_CHECKPOINT_ID.test(
      record.checkpointId,
    )
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || record.goalId !== goal.goalId
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || record.planId !== plan.planId
    || plan.goalId !== goal.goalId
    || !safeInteger(record.sequence)
    || Number(record.sequence) < 1
    || Number(record.sequence) > 1_000_000_000
    || !safeInteger(record.replanGeneration)
    || Number(record.replanGeneration)
      > 1_000_000
    || !safeInteger(record.createdAtMs)
    || Number(record.createdAtMs) > trustedNowMs
    || !safeInteger(record.expiresAtMs)
    || Number(record.expiresAtMs)
      <= Number(record.createdAtMs)
    || Number(record.expiresAtMs)
      <= trustedNowMs
    || Number(record.expiresAtMs)
      - Number(record.createdAtMs)
      > 90 * 24 * 60 * 60 * 1000
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  if (
    Number(record.sequence) === 1
      ? record.previousCheckpointId !== null
      : (
          typeof record.previousCheckpointId !== 'string'
          || !GOAL_CHECKPOINT_ID.test(
            record.previousCheckpointId,
          )
          || record.previousCheckpointId
            === record.checkpointId
        )
  ) {
    return null;
  }

  const executionState =
    parseResumableGoalExecutionState(
      goal,
      plan,
      record.executionState,
      trustedNowMs,
    );

  if (
    !executionState
    || executionState.updatedAtMs
      > Number(record.createdAtMs)
  ) {
    return null;
  }

  const committedUsage =
    parseUsage(record.committedUsage);

  if (
    !committedUsage
    || committedUsage.concurrentOperations
      !== 0
  ) {
    return null;
  }

  const committedReservations =
    parseCommittedReservations(
      record.committedReservations,
    );

  if (!committedReservations) {
    return null;
  }

  let reconstructedUsage: GoalResourceUsage =
    Object.freeze({
      modelCalls: 0,
      providerCostMicros: 0,
      networkRequests: 0,
      outputBytes: 0,
      concurrentOperations: 0,
    });

  for (const item of committedReservations) {
    const next =
      addUsage(
        reconstructedUsage,
        item.usage,
      );

    if (!next) {
      return null;
    }

    reconstructedUsage = next;
  }

  if (!sameUsage(
    reconstructedUsage,
    committedUsage,
  )) {
    return null;
  }

  const receipts =
    parseReceipts(
      record.receipts,
      goal.goalId,
      Number(record.createdAtMs),
    );

  if (!receipts) {
    return null;
  }

  const receiptLeaseIds =
    new Set(
      receipts.map(
        (receipt) => receipt.leaseId,
      ),
    );

  const rollbacks =
    parseRollbacks(
      record.rollbacks,
      goal.goalId,
      Number(record.createdAtMs),
      receiptLeaseIds,
    );

  if (!rollbacks) {
    return null;
  }

  const currentPlanStepIds =
    new Set(
      plan.steps.map(
        (step) => step.stepId,
      ),
    );

  const lastGenerations =
    parseGenerations(
      record.lastGenerations,
      currentPlanStepIds,
    );

  if (!lastGenerations) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    checkpointId:
      record.checkpointId as string,
    goalId: goal.goalId,
    planId: plan.planId,
    sequence: record.sequence as number,
    previousCheckpointId:
      record.previousCheckpointId as
        string | null,
    replanGeneration:
      record.replanGeneration as number,
    executionState,
    committedUsage,
    committedReservations,
    receipts,
    rollbacks,
    lastGenerations,
    createdAtMs: record.createdAtMs as number,
    expiresAtMs: record.expiresAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export function validateGoalCheckpointTrustAnchor(
  checkpoint: GoalExecutionCheckpoint,
  anchor: GoalCheckpointTrustAnchor,
): boolean {
  return (
    GOAL_CHECKPOINT_ID.test(
      anchor.checkpointId,
    )
    && safeInteger(anchor.sequence)
    && anchor.sequence >= 1
    && checkpoint.checkpointId
      === anchor.checkpointId
    && checkpoint.sequence
      === anchor.sequence
  );
}
