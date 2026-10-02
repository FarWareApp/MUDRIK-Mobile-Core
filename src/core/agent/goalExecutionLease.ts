import {
  exactObject,
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  GOAL_ID,
  GOAL_PLAN_ID,
  GOAL_STEP_ID,
} from './goalContract';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const LEASE_ID =
  new RegExp('^goal_lease_' + BODY + '$');

export type GoalExecutionLease =
  Readonly<{
    protocolVersion: '1.0';
    leaseId: string;
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    issuedAtMs: number;
    expiresAtMs: number;
    generation: number;
    approvalRef: string | null;
    grantIds: readonly string[];
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const KEYS =
  new Set([
    'protocolVersion',
    'leaseId',
    'goalId',
    'planId',
    'stepId',
    'operationRef',
    'issuedAtMs',
    'expiresAtMs',
    'generation',
    'approvalRef',
    'grantIds',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

function parseRefs(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 32
  ) {
    return null;
  }

  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of value) {
    if (
      !safeReference(item, 240)
      || seen.has(item)
    ) {
      return null;
    }
    seen.add(item);
    output.push(item);
  }

  return Object.freeze(output);
}

export function parseGoalExecutionLease(
  input: unknown,
): GoalExecutionLease | null {
  const record = exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.leaseId !== 'string'
    || !LEASE_ID.test(record.leaseId)
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.planId !== 'string'
    || !GOAL_PLAN_ID.test(record.planId)
    || typeof record.stepId !== 'string'
    || !GOAL_STEP_ID.test(record.stepId)
    || !safeReference(record.operationRef, 240)
    || !safeInteger(record.issuedAtMs)
    || !safeInteger(record.expiresAtMs)
    || Number(record.expiresAtMs)
      <= Number(record.issuedAtMs)
    || !safeInteger(record.generation)
    || (
      record.approvalRef !== null
      && !safeReference(record.approvalRef, 240)
    )
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const grantIds = parseRefs(record.grantIds);
  if (!grantIds) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    leaseId: record.leaseId as string,
    goalId: record.goalId as string,
    planId: record.planId as string,
    stepId: record.stepId as string,
    operationRef: record.operationRef as string,
    issuedAtMs: record.issuedAtMs as number,
    expiresAtMs: record.expiresAtMs as number,
    generation: record.generation as number,
    approvalRef: record.approvalRef as string | null,
    grantIds,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

export type GoalExecutionLeaseValidation =
  Readonly<{
    accepted: boolean;
    reason:
      | 'valid'
      | 'invalid_lease'
      | 'identity_mismatch'
      | 'operation_mismatch'
      | 'expired'
      | 'future_lease'
      | 'generation_mismatch'
      | 'approval_mismatch'
      | 'grant_mismatch';
  }>;

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length
    && left.every((item, index) => item === right[index])
  );
}

export function validateGoalExecutionLease(
  leaseInput: unknown,
  expected: Readonly<{
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    generation: number;
    approvalRef: string | null;
    grantIds: readonly string[];
  }>,
  trustedNowMs: number,
): GoalExecutionLeaseValidation {
  const lease = parseGoalExecutionLease(leaseInput);

  if (!lease || !safeInteger(trustedNowMs)) {
    return Object.freeze({
      accepted: false,
      reason: 'invalid_lease',
    });
  }

  if (
    lease.goalId !== expected.goalId
    || lease.planId !== expected.planId
    || lease.stepId !== expected.stepId
  ) {
    return Object.freeze({
      accepted: false,
      reason: 'identity_mismatch',
    });
  }

  if (lease.operationRef !== expected.operationRef) {
    return Object.freeze({
      accepted: false,
      reason: 'operation_mismatch',
    });
  }

  if (lease.issuedAtMs > trustedNowMs) {
    return Object.freeze({
      accepted: false,
      reason: 'future_lease',
    });
  }

  if (lease.expiresAtMs <= trustedNowMs) {
    return Object.freeze({
      accepted: false,
      reason: 'expired',
    });
  }

  if (lease.generation !== expected.generation) {
    return Object.freeze({
      accepted: false,
      reason: 'generation_mismatch',
    });
  }

  if (lease.approvalRef !== expected.approvalRef) {
    return Object.freeze({
      accepted: false,
      reason: 'approval_mismatch',
    });
  }

  if (!sameStrings(lease.grantIds, expected.grantIds)) {
    return Object.freeze({
      accepted: false,
      reason: 'grant_mismatch',
    });
  }

  return Object.freeze({
    accepted: true,
    reason: 'valid',
  });
}
