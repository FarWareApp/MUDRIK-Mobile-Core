import {
  safeInteger,
} from '../brain/brainSecurity';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const RESERVATION_ID =
  new RegExp(
    '^goal_budget_reservation_' + BODY + '$',
  );

export type GoalResourceBudgetPolicy =
  Readonly<{
    maxModelCalls: number;
    maxProviderCostMicros: number;
    maxNetworkRequests: number;
    maxOutputBytes: number;
    maxConcurrentOperations: number;
    maxWallTimeMs: number;
  }>;

export type GoalResourceUsage =
  Readonly<{
    modelCalls: number;
    providerCostMicros: number;
    networkRequests: number;
    outputBytes: number;
    concurrentOperations: number;
  }>;

export type GoalBudgetReservation =
  Readonly<{
    reservationId: string;
    usage: GoalResourceUsage;
    reservedAtMs: number;
  }>;

export type GoalBudgetDecision =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    reason:
      | 'accepted'
      | 'idempotent'
      | 'invalid_input'
      | 'wall_time_exhausted'
      | 'model_call_budget_exhausted'
      | 'cost_budget_exhausted'
      | 'network_budget_exhausted'
      | 'output_budget_exhausted'
      | 'concurrency_budget_exhausted'
      | 'reservation_conflict'
      | 'reservation_missing'
      | 'actual_exceeds_reservation';
  }>;

const ZERO_USAGE: GoalResourceUsage =
  Object.freeze({
    modelCalls: 0,
    providerCostMicros: 0,
    networkRequests: 0,
    outputBytes: 0,
    concurrentOperations: 0,
  });

function validUsage(
  usage: GoalResourceUsage,
): boolean {
  return (
    safeInteger(usage.modelCalls)
    && safeInteger(usage.providerCostMicros)
    && safeInteger(usage.networkRequests)
    && safeInteger(usage.outputBytes)
    && safeInteger(usage.concurrentOperations)
  );
}

export function validateGoalResourceBudgetPolicy(
  policy: GoalResourceBudgetPolicy,
): boolean {
  return (
    safeInteger(policy.maxModelCalls)
    && policy.maxModelCalls >= 1
    && policy.maxModelCalls <= 10_000
    && safeInteger(policy.maxProviderCostMicros)
    && policy.maxProviderCostMicros
      <= 1_000_000_000_000
    && safeInteger(policy.maxNetworkRequests)
    && policy.maxNetworkRequests <= 100_000
    && safeInteger(policy.maxOutputBytes)
    && policy.maxOutputBytes >= 1
    && policy.maxOutputBytes
      <= 1024 * 1024 * 1024
    && safeInteger(policy.maxConcurrentOperations)
    && policy.maxConcurrentOperations >= 1
    && policy.maxConcurrentOperations <= 128
    && safeInteger(policy.maxWallTimeMs)
    && policy.maxWallTimeMs >= 1000
    && policy.maxWallTimeMs
      <= 24 * 60 * 60 * 1000
  );
}

function addUsage(
  left: GoalResourceUsage,
  right: GoalResourceUsage,
): GoalResourceUsage {
  return Object.freeze({
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
  });
}

function subtractUsage(
  left: GoalResourceUsage,
  right: GoalResourceUsage,
): GoalResourceUsage {
  return Object.freeze({
    modelCalls:
      left.modelCalls - right.modelCalls,
    providerCostMicros:
      left.providerCostMicros
      - right.providerCostMicros,
    networkRequests:
      left.networkRequests
      - right.networkRequests,
    outputBytes:
      left.outputBytes - right.outputBytes,
    concurrentOperations:
      left.concurrentOperations
      - right.concurrentOperations,
  });
}

function committedUsage(
  usage: GoalResourceUsage,
): GoalResourceUsage {
  return Object.freeze({
    ...usage,
    concurrentOperations: 0,
  });
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

function decision(
  accepted: boolean,
  idempotent: boolean,
  reason: GoalBudgetDecision['reason'],
): GoalBudgetDecision {
  return Object.freeze({
    accepted,
    idempotent,
    reason,
  });
}

function budgetReason(
  policy: GoalResourceBudgetPolicy,
  usage: GoalResourceUsage,
): GoalBudgetDecision['reason'] | null {
  if (usage.modelCalls > policy.maxModelCalls) {
    return 'model_call_budget_exhausted';
  }
  if (
    usage.providerCostMicros
    > policy.maxProviderCostMicros
  ) {
    return 'cost_budget_exhausted';
  }
  if (
    usage.networkRequests
    > policy.maxNetworkRequests
  ) {
    return 'network_budget_exhausted';
  }
  if (usage.outputBytes > policy.maxOutputBytes) {
    return 'output_budget_exhausted';
  }
  if (
    usage.concurrentOperations
    > policy.maxConcurrentOperations
  ) {
    return 'concurrency_budget_exhausted';
  }
  return null;
}

export class GoalResourceBudgetLedger {
  private committed: GoalResourceUsage =
    ZERO_USAGE;

  private reserved: GoalResourceUsage =
    ZERO_USAGE;

  private readonly reservations =
    new Map<string, GoalBudgetReservation>();

  private readonly committedReservations =
    new Map<string, GoalResourceUsage>();

  constructor(
    private readonly policy:
      GoalResourceBudgetPolicy,
    private readonly startedAtMs: number,
  ) {
    if (
      !validateGoalResourceBudgetPolicy(policy)
      || !safeInteger(startedAtMs)
    ) {
      throw new TypeError(
        'Invalid goal resource budget.',
      );
    }
  }

  reserve(
    reservationId: string,
    usage: GoalResourceUsage,
    trustedNowMs: number,
  ): GoalBudgetDecision {
    if (
      !RESERVATION_ID.test(reservationId)
      || !validUsage(usage)
      || !safeInteger(trustedNowMs)
    ) {
      return decision(
        false,
        false,
        'invalid_input',
      );
    }

    if (
      trustedNowMs < this.startedAtMs
      || trustedNowMs - this.startedAtMs
        > this.policy.maxWallTimeMs
    ) {
      return decision(
        false,
        false,
        'wall_time_exhausted',
      );
    }

    const existing =
      this.reservations.get(reservationId);

    if (existing) {
      return sameUsage(existing.usage, usage)
        ? decision(
            true,
            true,
            'idempotent',
          )
        : decision(
            false,
            false,
            'reservation_conflict',
          );
    }

    if (
      this.committedReservations.has(
        reservationId,
      )
    ) {
      return decision(
        false,
        false,
        'reservation_conflict',
      );
    }

    const projected =
      addUsage(
        addUsage(
          this.committed,
          this.reserved,
        ),
        usage,
      );
    const exhausted =
      budgetReason(this.policy, projected);

    if (exhausted) {
      return decision(
        false,
        false,
        exhausted,
      );
    }

    const reservation =
      Object.freeze({
        reservationId,
        usage: Object.freeze({ ...usage }),
        reservedAtMs: trustedNowMs,
      });

    this.reservations.set(
      reservationId,
      reservation,
    );
    this.reserved =
      addUsage(this.reserved, usage);

    return decision(
      true,
      false,
      'accepted',
    );
  }

  commit(
    reservationId: string,
    actualUsage: GoalResourceUsage,
    trustedNowMs: number,
  ): GoalBudgetDecision {
    if (
      !RESERVATION_ID.test(reservationId)
      || !validUsage(actualUsage)
      || !safeInteger(trustedNowMs)
      || trustedNowMs < this.startedAtMs
    ) {
      return decision(
        false,
        false,
        'invalid_input',
      );
    }

    if (
      trustedNowMs - this.startedAtMs
      > this.policy.maxWallTimeMs
    ) {
      return decision(
        false,
        false,
        'wall_time_exhausted',
      );
    }

    const committed =
      this.committedReservations.get(
        reservationId,
      );
    const normalizedActual =
      committedUsage(actualUsage);

    if (committed) {
      return sameUsage(
        committed,
        normalizedActual,
      )
        ? decision(
            true,
            true,
            'idempotent',
          )
        : decision(
            false,
            false,
            'reservation_conflict',
          );
    }

    const reservation =
      this.reservations.get(reservationId);

    if (!reservation) {
      return decision(
        false,
        false,
        'reservation_missing',
      );
    }

    const reservedUsage =
      reservation.usage;

    if (
      actualUsage.modelCalls
        > reservedUsage.modelCalls
      || actualUsage.providerCostMicros
        > reservedUsage.providerCostMicros
      || actualUsage.networkRequests
        > reservedUsage.networkRequests
      || actualUsage.outputBytes
        > reservedUsage.outputBytes
      || actualUsage.concurrentOperations
        > reservedUsage.concurrentOperations
    ) {
      return decision(
        false,
        false,
        'actual_exceeds_reservation',
      );
    }

    this.reserved =
      subtractUsage(
        this.reserved,
        reservedUsage,
      );
    this.committed =
      addUsage(
        this.committed,
        normalizedActual,
      );
    this.reservations.delete(reservationId);
    this.committedReservations.set(
      reservationId,
      normalizedActual,
    );

    return decision(
      true,
      false,
      'accepted',
    );
  }

  release(
    reservationId: string,
  ): GoalBudgetDecision {
    if (!RESERVATION_ID.test(reservationId)) {
      return decision(
        false,
        false,
        'invalid_input',
      );
    }

    const reservation =
      this.reservations.get(reservationId);

    if (!reservation) {
      return this.committedReservations.has(
        reservationId,
      )
        ? decision(
            false,
            false,
            'reservation_conflict',
          )
        : decision(
            false,
            false,
            'reservation_missing',
          );
    }

    this.reserved =
      subtractUsage(
        this.reserved,
        reservation.usage,
      );
    this.reservations.delete(reservationId);

    return decision(
      true,
      false,
      'accepted',
    );
  }

  getCommittedUsage(): GoalResourceUsage {
    return this.committed;
  }

  getReservedUsage(): GoalResourceUsage {
    return this.reserved;
  }

  canContinue(
    trustedNowMs: number,
  ): boolean {
    return (
      safeInteger(trustedNowMs)
      && trustedNowMs >= this.startedAtMs
      && trustedNowMs - this.startedAtMs
        <= this.policy.maxWallTimeMs
      && budgetReason(
        this.policy,
        addUsage(
          this.committed,
          this.reserved,
        ),
      ) === null
    );
  }
}

export const DEFAULT_GOAL_RESOURCE_BUDGET =
  Object.freeze({
    maxModelCalls: 12,
    maxProviderCostMicros: 5_000_000,
    maxNetworkRequests: 40,
    maxOutputBytes: 8 * 1024 * 1024,
    maxConcurrentOperations: 4,
    maxWallTimeMs: 15 * 60 * 1000,
  } satisfies GoalResourceBudgetPolicy);
