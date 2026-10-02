import {
  exactObject,
  safeInteger,
  safeReasonCode,
  safeReference,
} from '../brain/brainSecurity';

import {
  parseGoalExecutionLease,
  type GoalExecutionLease,
} from '../agent/goalExecutionLease';

import type {
  ToolRouteCandidate,
  ToolRouteDecision,
} from './toolOrchestrator';

export type ToolAdapterInvocation =
  Readonly<{
    protocolVersion: '1.0';
    leaseId: string;
    goalId: string;
    planId: string;
    stepId: string;
    operationRef: string;
    generation: number;
    attempt: number;
    idempotencyKey: string;
    startedAtMs: number;
    deadlineAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export type ToolAdapterOutput =
  Readonly<{
    protocolVersion: '1.0';
    status: 'succeeded' | 'failed';
    resultRef: string | null;
    evidenceRef: string | null;
    failureReason: string | null;
    retryable: boolean;
    sideEffectCommitted: boolean;
    completedAtMs: number;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

export interface ToolExecutionAdapter {
  readonly toolRef: string;
  execute(
    invocation: ToolAdapterInvocation,
  ): Promise<unknown>;
}

export interface ToolExecutionAdapterResolver {
  resolve(
    candidate: ToolRouteCandidate,
  ): ToolExecutionAdapter | null;
}

export type ToolExecutionInput =
  Readonly<{
    route: ToolRouteDecision;
    lease: GoalExecutionLease;
    sideEffect: boolean;
    maxAttempts: number;
    deadlineAtMs: number | null;
  }>;

export type ToolExecutionOutcome =
  Readonly<{
    status:
      | 'succeeded'
      | 'failed'
      | 'needs_reconciliation';
    toolRef: string | null;
    attempts: number;
    resultRef: string | null;
    evidenceRef: string | null;
    failureReason: string | null;
    sideEffectCommitted: boolean;
    completedAtMs: number | null;
    grantsExecutionAuthority: false;
    grantsSensorAuthority: false;
    grantsApprovalAuthority: false;
    grantsCapabilityAuthority: false;
  }>;

const OUTPUT_KEYS =
  new Set([
    'protocolVersion',
    'status',
    'resultRef',
    'evidenceRef',
    'failureReason',
    'retryable',
    'sideEffectCommitted',
    'completedAtMs',
    'grantsExecutionAuthority',
    'grantsSensorAuthority',
    'grantsApprovalAuthority',
    'grantsCapabilityAuthority',
  ]);

export function parseToolAdapterOutput(
  input: unknown,
): ToolAdapterOutput | null {
  const record =
    exactObject(input, OUTPUT_KEYS);

  if (
    !record
    || record.protocolVersion !== '1.0'
    || !['succeeded', 'failed']
      .includes(record.status as string)
    || typeof record.retryable !== 'boolean'
    || typeof record.sideEffectCommitted
      !== 'boolean'
    || !safeInteger(record.completedAtMs)
    || record.grantsExecutionAuthority !== false
    || record.grantsSensorAuthority !== false
    || record.grantsApprovalAuthority !== false
    || record.grantsCapabilityAuthority !== false
  ) {
    return null;
  }

  const status =
    record.status as ToolAdapterOutput['status'];

  if (
    record.resultRef !== null
    && !safeReference(record.resultRef, 240)
  ) {
    return null;
  }

  if (
    record.evidenceRef !== null
    && !safeReference(record.evidenceRef, 240)
  ) {
    return null;
  }

  if (
    record.failureReason !== null
    && !safeReasonCode(record.failureReason)
  ) {
    return null;
  }

  if (
    status === 'succeeded'
      ? (
          record.resultRef === null
          || record.evidenceRef === null
          || record.failureReason !== null
        )
      : (
          record.resultRef !== null
          || record.failureReason === null
        )
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    status,
    resultRef:
      record.resultRef as string | null,
    evidenceRef:
      record.evidenceRef as string | null,
    failureReason:
      record.failureReason as string | null,
    retryable: record.retryable as boolean,
    sideEffectCommitted:
      record.sideEffectCommitted as boolean,
    completedAtMs:
      record.completedAtMs as number,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function outcome(
  input: {
    status: ToolExecutionOutcome['status'];
    toolRef: string | null;
    attempts: number;
    resultRef?: string | null;
    evidenceRef?: string | null;
    failureReason?: string | null;
    sideEffectCommitted?: boolean;
    completedAtMs?: number | null;
  },
): ToolExecutionOutcome {
  return Object.freeze({
    status: input.status,
    toolRef: input.toolRef,
    attempts: input.attempts,
    resultRef: input.resultRef ?? null,
    evidenceRef: input.evidenceRef ?? null,
    failureReason:
      input.failureReason ?? null,
    sideEffectCommitted:
      input.sideEffectCommitted ?? false,
    completedAtMs:
      input.completedAtMs ?? null,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  });
}

function routeCandidates(
  route: ToolRouteDecision,
): readonly ToolRouteCandidate[] {
  return Object.freeze([
    ...(route.primary ? [route.primary] : []),
    ...route.fallbacks,
  ]);
}

function validInput(
  input: ToolExecutionInput,
): boolean {
  const lease =
    parseGoalExecutionLease(input.lease);

  return Boolean(
    lease
    && input.route.accepted
    && input.route.reason === 'routed'
    && input.route.primary
    && typeof input.sideEffect === 'boolean'
    && safeInteger(input.maxAttempts)
    && input.maxAttempts >= 1
    && input.maxAttempts <= 8
    && (
      input.deadlineAtMs === null
      || safeInteger(input.deadlineAtMs)
    )
    && (
      input.deadlineAtMs === null
      || input.deadlineAtMs
        <= lease.expiresAtMs
    ),
  );
}

export class ToolExecutionCoordinator {
  constructor(
    private readonly resolver:
      ToolExecutionAdapterResolver,
    private readonly clock:
      () => number = () => Date.now(),
  ) {}

  async execute(
    input: ToolExecutionInput,
  ): Promise<ToolExecutionOutcome> {
    if (!validInput(input)) {
      return outcome({
        status: 'failed',
        toolRef: null,
        attempts: 0,
        failureReason: 'invalid_execution_input',
      });
    }

    const lease =
      parseGoalExecutionLease(input.lease);

    if (!lease) {
      return outcome({
        status: 'failed',
        toolRef: null,
        attempts: 0,
        failureReason: 'invalid_execution_input',
      });
    }

    const candidates =
      routeCandidates(input.route);

    let attempts = 0;
    let lastFailure =
      'tool_unavailable';

    for (
      const candidate of candidates
    ) {
      if (attempts >= input.maxAttempts) {
        break;
      }

      const now = this.clock();

      if (
        !safeInteger(now)
        || now < lease.issuedAtMs
        || now >= lease.expiresAtMs
        || (
          input.deadlineAtMs !== null
          && now > input.deadlineAtMs
        )
      ) {
        return outcome({
          status: 'failed',
          toolRef: candidate.toolRef,
          attempts,
          failureReason: 'deadline_exceeded',
        });
      }

      const adapter =
        this.resolver.resolve(candidate);

      if (
        !adapter
        || adapter.toolRef !== candidate.toolRef
      ) {
        lastFailure = 'tool_unavailable';
        continue;
      }

      attempts += 1;

      const invocation =
        Object.freeze({
          protocolVersion: '1.0' as const,
          leaseId: lease.leaseId,
          goalId: lease.goalId,
          planId: lease.planId,
          stepId: lease.stepId,
          operationRef: lease.operationRef,
          generation: lease.generation,
          attempt: attempts,
          idempotencyKey: lease.leaseId,
          startedAtMs: now,
          deadlineAtMs:
            input.deadlineAtMs,
          grantsExecutionAuthority:
            false as const,
          grantsSensorAuthority:
            false as const,
          grantsApprovalAuthority:
            false as const,
          grantsCapabilityAuthority:
            false as const,
        });

      let raw: unknown;

      try {
        raw = await adapter.execute(invocation);
      } catch {
        lastFailure = 'adapter_exception';
        continue;
      }

      const result =
        parseToolAdapterOutput(raw);

      if (
        !result
        || result.completedAtMs < now
        || result.completedAtMs
          > lease.expiresAtMs
        || (
          input.deadlineAtMs !== null
          && result.completedAtMs
            > input.deadlineAtMs
        )
      ) {
        lastFailure = 'invalid_tool_output';
        continue;
      }

      if (result.status === 'succeeded') {
        if (
          result.sideEffectCommitted
            !== input.sideEffect
        ) {
          return outcome({
            status: 'needs_reconciliation',
            toolRef: candidate.toolRef,
            attempts,
            failureReason:
              'side_effect_commit_mismatch',
            sideEffectCommitted:
              result.sideEffectCommitted,
            completedAtMs:
              result.completedAtMs,
          });
        }

        return outcome({
          status: 'succeeded',
          toolRef: candidate.toolRef,
          attempts,
          resultRef: result.resultRef,
          evidenceRef:
            result.evidenceRef,
          sideEffectCommitted:
            result.sideEffectCommitted,
          completedAtMs:
            result.completedAtMs,
        });
      }

      lastFailure =
        result.failureReason
        ?? 'tool_failed';

      if (
        input.sideEffect
        && result.sideEffectCommitted
      ) {
        return outcome({
          status: 'needs_reconciliation',
          toolRef: candidate.toolRef,
          attempts,
          evidenceRef:
            result.evidenceRef,
          failureReason:
            result.failureReason,
          sideEffectCommitted: true,
          completedAtMs:
            result.completedAtMs,
        });
      }

      if (!result.retryable) {
        return outcome({
          status: 'failed',
          toolRef: candidate.toolRef,
          attempts,
          evidenceRef:
            result.evidenceRef,
          failureReason:
            result.failureReason,
          sideEffectCommitted:
            result.sideEffectCommitted,
          completedAtMs:
            result.completedAtMs,
        });
      }
    }

    return outcome({
      status: 'failed',
      toolRef: null,
      attempts,
      failureReason: lastFailure,
    });
  }
}
