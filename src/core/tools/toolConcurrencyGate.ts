import {
  safeInteger,
  safeReference,
} from '../brain/brainSecurity';

import {
  TOOL_REF,
} from './toolOrchestrator';

export type ToolConcurrencyLimit =
  Readonly<{
    toolRef: string;
    maxConcurrent: number;
  }>;

export type ToolConcurrencyPermit =
  Readonly<{
    operationRef: string;
    toolRef: string;
    acquiredAtMs: number;
    expiresAtMs: number;
  }>;

export type ToolConcurrencyAdmission =
  Readonly<{
    allowed: boolean;
    idempotent: boolean;
    reason:
      | 'acquired'
      | 'idempotent'
      | 'invalid_input'
      | 'tool_unconfigured'
      | 'tool_saturated'
      | 'global_saturated'
      | 'operation_conflict';
    permit: ToolConcurrencyPermit | null;
    activeForTool: number;
    activeGlobal: number;
  }>;

export type ToolConcurrencyRelease =
  Readonly<{
    released: boolean;
    idempotent: boolean;
    reason:
      | 'released'
      | 'idempotent'
      | 'invalid_input'
      | 'operation_conflict';
    activeForTool: number;
    activeGlobal: number;
  }>;

function validLimit(
  value: ToolConcurrencyLimit,
): boolean {
  return (
    TOOL_REF.test(value.toolRef)
    && safeInteger(value.maxConcurrent)
    && value.maxConcurrent >= 1
    && value.maxConcurrent <= 128
  );
}

function admission(
  allowed: boolean,
  idempotent: boolean,
  reason: ToolConcurrencyAdmission['reason'],
  permit: ToolConcurrencyPermit | null,
  activeForTool: number,
  activeGlobal: number,
): ToolConcurrencyAdmission {
  return Object.freeze({
    allowed,
    idempotent,
    reason,
    permit,
    activeForTool,
    activeGlobal,
  });
}

function releaseResult(
  released: boolean,
  idempotent: boolean,
  reason: ToolConcurrencyRelease['reason'],
  activeForTool: number,
  activeGlobal: number,
): ToolConcurrencyRelease {
  return Object.freeze({
    released,
    idempotent,
    reason,
    activeForTool,
    activeGlobal,
  });
}

export class ToolConcurrencyGate {
  private readonly limits =
    new Map<string, number>();

  private readonly permits =
    new Map<string, ToolConcurrencyPermit>();

  constructor(
    limits: readonly ToolConcurrencyLimit[],
    private readonly globalMaxConcurrent: number,
  ) {
    if (
      !Array.isArray(limits)
      || limits.length > 1024
      || !safeInteger(globalMaxConcurrent)
      || globalMaxConcurrent < 1
      || globalMaxConcurrent > 4096
    ) {
      throw new TypeError(
        'Invalid tool concurrency configuration.',
      );
    }

    for (const limit of limits) {
      if (
        !validLimit(limit)
        || this.limits.has(limit.toolRef)
      ) {
        throw new TypeError(
          'Invalid or duplicate tool concurrency limit.',
        );
      }
      this.limits.set(
        limit.toolRef,
        limit.maxConcurrent,
      );
    }
  }

  private reapExpired(
    trustedNowMs: number,
  ): void {
    for (const [key, permit] of this.permits) {
      if (permit.expiresAtMs <= trustedNowMs) {
        this.permits.delete(key);
      }
    }
  }

  private activeFor(
    toolRef: string,
  ): number {
    let count = 0;
    for (const permit of this.permits.values()) {
      if (permit.toolRef === toolRef) {
        count += 1;
      }
    }
    return count;
  }

  acquire(
    toolRef: string,
    operationRef: string,
    trustedNowMs: number,
    expiresAtMs: number,
  ): ToolConcurrencyAdmission {
    if (
      !TOOL_REF.test(toolRef)
      || !safeReference(operationRef, 240)
      || !safeInteger(trustedNowMs)
      || !safeInteger(expiresAtMs)
      || expiresAtMs <= trustedNowMs
    ) {
      return admission(
        false,
        false,
        'invalid_input',
        null,
        0,
        this.permits.size,
      );
    }

    this.reapExpired(trustedNowMs);

    const limit = this.limits.get(toolRef);
    if (!limit) {
      return admission(
        false,
        false,
        'tool_unconfigured',
        null,
        0,
        this.permits.size,
      );
    }

    const existing =
      this.permits.get(operationRef);

    if (existing) {
      if (
        existing.toolRef === toolRef
        && existing.expiresAtMs === expiresAtMs
      ) {
        return admission(
          true,
          true,
          'idempotent',
          existing,
          this.activeFor(toolRef),
          this.permits.size,
        );
      }

      return admission(
        false,
        false,
        'operation_conflict',
        null,
        this.activeFor(toolRef),
        this.permits.size,
      );
    }

    const activeForTool =
      this.activeFor(toolRef);

    if (activeForTool >= limit) {
      return admission(
        false,
        false,
        'tool_saturated',
        null,
        activeForTool,
        this.permits.size,
      );
    }

    if (
      this.permits.size
        >= this.globalMaxConcurrent
    ) {
      return admission(
        false,
        false,
        'global_saturated',
        null,
        activeForTool,
        this.permits.size,
      );
    }

    const permit =
      Object.freeze({
        operationRef,
        toolRef,
        acquiredAtMs: trustedNowMs,
        expiresAtMs,
      });

    this.permits.set(
      operationRef,
      permit,
    );

    return admission(
      true,
      false,
      'acquired',
      permit,
      activeForTool + 1,
      this.permits.size,
    );
  }

  release(
    operationRef: string,
    toolRef: string,
    trustedNowMs: number,
  ): ToolConcurrencyRelease {
    if (
      !safeReference(operationRef, 240)
      || !TOOL_REF.test(toolRef)
      || !safeInteger(trustedNowMs)
    ) {
      return releaseResult(
        false,
        false,
        'invalid_input',
        0,
        this.permits.size,
      );
    }

    this.reapExpired(trustedNowMs);

    const current =
      this.permits.get(operationRef);

    if (!current) {
      return releaseResult(
        true,
        true,
        'idempotent',
        this.activeFor(toolRef),
        this.permits.size,
      );
    }

    if (current.toolRef !== toolRef) {
      return releaseResult(
        false,
        false,
        'operation_conflict',
        this.activeFor(toolRef),
        this.permits.size,
      );
    }

    this.permits.delete(operationRef);

    return releaseResult(
      true,
      false,
      'released',
      this.activeFor(toolRef),
      this.permits.size,
    );
  }

  snapshot(
    trustedNowMs: number,
  ): readonly ToolConcurrencyPermit[] {
    if (!safeInteger(trustedNowMs)) {
      return Object.freeze([]);
    }

    this.reapExpired(trustedNowMs);

    return Object.freeze(
      [...this.permits.values()]
        .sort(
          (left, right) =>
            left.acquiredAtMs - right.acquiredAtMs
            || left.operationRef.localeCompare(
              right.operationRef,
            ),
        ),
    );
  }
}
