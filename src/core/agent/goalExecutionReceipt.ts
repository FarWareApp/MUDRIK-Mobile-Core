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

const RECEIPT_ID =
  new RegExp('^goal_receipt_' + BODY + '$');

const LEASE_ID =
  new RegExp('^goal_lease_' + BODY + '$');

export type GoalExecutionReceipt =
  Readonly<{
    protocolVersion: '1.0';
    receiptId: string;
    leaseId: string;
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    generation: number;
    attempt: number;
    outcome: 'succeeded' | 'failed';
    resultRef: string | null;
    evidenceRef: string | null;
    failureReason: string | null;
    startedAtMs: number;
    completedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'receiptId',
    'leaseId',
    'goalId',
    'planId',
    'stepId',
    'operationRef',
    'generation',
    'attempt',
    'outcome',
    'resultRef',
    'evidenceRef',
    'failureReason',
    'startedAtMs',
    'completedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseGoalExecutionReceipt(
  input: unknown,
): GoalExecutionReceipt | null {
  const record = exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.receiptId !== 'string'
    || !RECEIPT_ID.test(record.receiptId)
    || typeof record.leaseId !== 'string'
    || !LEASE_ID.test(record.leaseId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || typeof record.stepId !== 'string'
    || !GOAL_STEP_ID.test(record.stepId)
    || !safeReference(record.operationRef, 240)
    || !safeInteger(record.generation)
    || !safeInteger(record.attempt)
    || Number(record.attempt) < 1
    || Number(record.attempt) > 128
    || !['succeeded', 'failed'].includes(
      record.outcome as string,
    )
    || !safeInteger(record.startedAtMs)
    || !safeInteger(record.completedAtMs)
    || Number(record.completedAtMs)
      < Number(record.startedAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const outcome =
    record.outcome as GoalExecutionReceipt['outcome'];

  const resultRef =
    record.resultRef;
  const evidenceRef =
    record.evidenceRef;
  const failureReason =
    record.failureReason;

  if (
    resultRef !== null
    && !safeReference(resultRef, 240)
  ) {
    return null;
  }

  if (
    evidenceRef !== null
    && !safeReference(evidenceRef, 240)
  ) {
    return null;
  }

  if (
    failureReason !== null
    && !safeReasonCode(failureReason)
  ) {
    return null;
  }

  if (
    outcome === 'succeeded'
      ? (
          resultRef === null
          || evidenceRef === null
          || failureReason !== null
        )
      : (
          resultRef !== null
          || failureReason === null
        )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    receiptId: record.receiptId as string,
    leaseId: record.leaseId as string,
    goalId: record.goalId as string,
    planId: record.planId as string,
    stepId: record.stepId as string,
    operationRef: record.operationRef as string,
    generation: record.generation as number,
    attempt: record.attempt as number,
    outcome,
    resultRef: resultRef as string | null,
    evidenceRef: evidenceRef as string | null,
    failureReason: failureReason as string | null,
    startedAtMs: record.startedAtMs as number,
    completedAtMs: record.completedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export type GoalReceiptAcceptResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'idempotent'
      | 'invalid_receipt'
      | 'lease_mismatch'
      | 'receipt_conflict'
      | 'attempt_replay'
      | 'time_invalid';
  }>;

function sameReceipt(
  left: GoalExecutionReceipt,
  right: GoalExecutionReceipt,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class GoalExecutionReceiptRegistry {
  private readonly byReceiptId =
    new Map<string, GoalExecutionReceipt>();
  private readonly byLeaseId =
    new Map<string, GoalExecutionReceipt>();
  private readonly byAttempt =
    new Map<string, GoalExecutionReceipt>();

  accept(
    input: unknown,
    trustedNowMs: number,
  ): GoalReceiptAcceptResult {
    const receipt =
      parseGoalExecutionReceipt(input);

    if (!receipt) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        reason: 'invalid_receipt',
      });
    }

    if (
      !safeInteger(trustedNowMs)
      || receipt.completedAtMs > trustedNowMs
    ) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        reason: 'time_invalid',
      });
    }

    const existingId =
      this.byReceiptId.get(receipt.receiptId);

    if (existingId) {
      return sameReceipt(existingId, receipt)
        ? Object.freeze({
            accepted: true,
            idempotent: true,
            reason: 'idempotent',
          })
        : Object.freeze({
            accepted: false,
            idempotent: false,
            reason: 'receipt_conflict',
          });
    }

    const existingLease =
      this.byLeaseId.get(receipt.leaseId);

    if (existingLease) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        reason: 'lease_mismatch',
      });
    }

    const attemptKey =
      [
        receipt.goalId,
        receipt.planId,
        receipt.stepId,
        receipt.generation,
        receipt.attempt,
      ].join(':');

    if (this.byAttempt.has(attemptKey)) {
      return Object.freeze({
        accepted: false,
        idempotent: false,
        reason: 'attempt_replay',
      });
    }

    this.byReceiptId.set(
      receipt.receiptId,
      receipt,
    );
    this.byLeaseId.set(
      receipt.leaseId,
      receipt,
    );
    this.byAttempt.set(
      attemptKey,
      receipt,
    );

    return Object.freeze({
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    });
  }
}
