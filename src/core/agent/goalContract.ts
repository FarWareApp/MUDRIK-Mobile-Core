import {
  BRAIN_REQUEST_ID,
  exactObject,
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import type {
  CapabilityRisk,
} from '../security/capabilityRisk';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

export const GOAL_ID =
  new RegExp('^goal_' + BODY + '$');

export const GOAL_PLAN_ID =
  new RegExp('^goal_plan_' + BODY + '$');

export const GOAL_STEP_ID =
  new RegExp('^goal_step_' + BODY + '$');

export type GoalIntentKind =
  | 'answer'
  | 'research'
  | 'create'
  | 'transform'
  | 'diagnose'
  | 'operate'
  | 'automate'
  | 'coordinate';

export type GoalVerificationMode =
  | 'none'
  | 'standard'
  | 'strict';

export type GoalSideEffectPolicy =
  | 'read-only'
  | 'approval-required';

export type GoalExecutionSpec =
  Readonly<{
    protocolVersion: '1.0';
    goalId: string;
    sourceRequestId: string;
    workspaceId: string | null;
    intent: GoalIntentKind;
    risk: CapabilityRisk;
    verification: GoalVerificationMode;
    sideEffectPolicy: GoalSideEffectPolicy;
    maxSteps: number;
    maxRepairCycles: number;
    maxToolAttempts: number;
    createdAtMs: number;
    deadlineAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const INTENTS =
  new Set<GoalIntentKind>([
    'answer',
    'research',
    'create',
    'transform',
    'diagnose',
    'operate',
    'automate',
    'coordinate',
  ]);

const RISKS =
  new Set<CapabilityRisk>([
    'low',
    'medium',
    'high',
    'critical',
  ]);

const VERIFICATION =
  new Set<GoalVerificationMode>([
    'none',
    'standard',
    'strict',
  ]);

const SIDE_EFFECT =
  new Set<GoalSideEffectPolicy>([
    'read-only',
    'approval-required',
  ]);

const KEYS =
  new Set([
    'protocolVersion',
    'goalId',
    'sourceRequestId',
    'workspaceId',
    'intent',
    'risk',
    'verification',
    'sideEffectPolicy',
    'maxSteps',
    'maxRepairCycles',
    'maxToolAttempts',
    'createdAtMs',
    'deadlineAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseGoalExecutionSpec(
  input: unknown,
): GoalExecutionSpec | null {
  const record = exactObject(input, KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || typeof record.goalId !== 'string'
    || !GOAL_ID.test(record.goalId)
    || typeof record.sourceRequestId !== 'string'
    || !BRAIN_REQUEST_ID.test(record.sourceRequestId)
    || (
      record.workspaceId !== null
      && !safeReference(record.workspaceId, 180)
    )
    || typeof record.intent !== 'string'
    || !INTENTS.has(record.intent as GoalIntentKind)
    || typeof record.risk !== 'string'
    || !RISKS.has(record.risk as CapabilityRisk)
    || typeof record.verification !== 'string'
    || !VERIFICATION.has(
      record.verification as GoalVerificationMode,
    )
    || typeof record.sideEffectPolicy !== 'string'
    || !SIDE_EFFECT.has(
      record.sideEffectPolicy as GoalSideEffectPolicy,
    )
    || !safeInteger(record.maxSteps)
    || Number(record.maxSteps) < 1
    || Number(record.maxSteps) > 64
    || !safeInteger(record.maxRepairCycles)
    || Number(record.maxRepairCycles) > 5
    || !safeInteger(record.maxToolAttempts)
    || Number(record.maxToolAttempts) > 128
    || !safeInteger(record.createdAtMs)
    || (
      record.deadlineAtMs !== null
      && (
        !safeInteger(record.deadlineAtMs)
        || Number(record.deadlineAtMs)
          <= Number(record.createdAtMs)
      )
    )
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const risk = record.risk as CapabilityRisk;
  const verification =
    record.verification as GoalVerificationMode;
  const sideEffectPolicy =
    record.sideEffectPolicy as GoalSideEffectPolicy;

  if (
    (risk === 'critical' && verification !== 'strict')
    || (
      sideEffectPolicy === 'read-only'
      && ['operate', 'automate'].includes(
        record.intent as string,
      )
    )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    goalId: record.goalId as string,
    sourceRequestId: record.sourceRequestId as string,
    workspaceId: record.workspaceId as string | null,
    intent: record.intent as GoalIntentKind,
    risk,
    verification,
    sideEffectPolicy,
    maxSteps: record.maxSteps as number,
    maxRepairCycles: record.maxRepairCycles as number,
    maxToolAttempts: record.maxToolAttempts as number,
    createdAtMs: record.createdAtMs as number,
    deadlineAtMs: record.deadlineAtMs as number | null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}
