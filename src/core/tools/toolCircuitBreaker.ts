import {
  safeInteger,
} from '../brain/brainSecurity';

import {
  TOOL_REF,
} from './toolOrchestrator';

export type ToolCircuitBreakerPolicy =
  Readonly<{
    failureThreshold: number;
    failureWindowMs: number;
    cooldownMs: number;
    halfOpenMaxAttempts: number;
    halfOpenSuccessesToClose: number;
  }>;

export type ToolCircuitState =
  | 'closed'
  | 'open'
  | 'half-open';

export type ToolCircuitSnapshot =
  Readonly<{
    toolRef: string;
    state: ToolCircuitState;
    failureCount: number;
    retryAtMs: number | null;
    halfOpenAttempts: number;
    halfOpenSuccesses: number;
    updatedAtMs: number;
  }>;

export type ToolCircuitAdmission =
  Readonly<{
    allowed: boolean;
    probe: boolean;
    reason:
      | 'allowed'
      | 'half_open_probe'
      | 'circuit_open'
      | 'probe_budget_exhausted'
      | 'invalid_input';
    snapshot: ToolCircuitSnapshot | null;
  }>;

type MutableCircuit = {
  toolRef: string;
  state: ToolCircuitState;
  failures: number[];
  retryAtMs: number | null;
  halfOpenAttempts: number;
  halfOpenSuccesses: number;
  updatedAtMs: number;
};

function validPolicy(
  policy: ToolCircuitBreakerPolicy,
): boolean {
  return (
    safeInteger(policy.failureThreshold)
    && policy.failureThreshold >= 1
    && policy.failureThreshold <= 20
    && safeInteger(policy.failureWindowMs)
    && policy.failureWindowMs >= 1000
    && policy.failureWindowMs
      <= 60 * 60 * 1000
    && safeInteger(policy.cooldownMs)
    && policy.cooldownMs >= 1000
    && policy.cooldownMs
      <= 60 * 60 * 1000
    && safeInteger(policy.halfOpenMaxAttempts)
    && policy.halfOpenMaxAttempts >= 1
    && policy.halfOpenMaxAttempts <= 8
    && safeInteger(
      policy.halfOpenSuccessesToClose,
    )
    && policy.halfOpenSuccessesToClose >= 1
    && policy.halfOpenSuccessesToClose
      <= policy.halfOpenMaxAttempts
  );
}

function snapshot(
  value: MutableCircuit,
): ToolCircuitSnapshot {
  return Object.freeze({
    toolRef: value.toolRef,
    state: value.state,
    failureCount: value.failures.length,
    retryAtMs: value.retryAtMs,
    halfOpenAttempts:
      value.halfOpenAttempts,
    halfOpenSuccesses:
      value.halfOpenSuccesses,
    updatedAtMs: value.updatedAtMs,
  });
}

export class ToolCircuitBreakerRegistry {
  private readonly circuits =
    new Map<string, MutableCircuit>();

  constructor(
    private readonly policy:
      ToolCircuitBreakerPolicy,
  ) {
    if (!validPolicy(policy)) {
      throw new TypeError(
        'Invalid tool circuit-breaker policy.',
      );
    }
  }

  private getOrCreate(
    toolRef: string,
    trustedNowMs: number,
  ): MutableCircuit {
    const existing =
      this.circuits.get(toolRef);

    if (existing) {
      return existing;
    }

    const created: MutableCircuit = {
      toolRef,
      state: 'closed',
      failures: [],
      retryAtMs: null,
      halfOpenAttempts: 0,
      halfOpenSuccesses: 0,
      updatedAtMs: trustedNowMs,
    };

    this.circuits.set(toolRef, created);
    return created;
  }

  private prune(
    circuit: MutableCircuit,
    trustedNowMs: number,
  ): void {
    const cutoff =
      trustedNowMs
      - this.policy.failureWindowMs;

    circuit.failures =
      circuit.failures.filter(
        (value) => value >= cutoff,
      );
  }

  admit(
    toolRef: string,
    trustedNowMs: number,
  ): ToolCircuitAdmission {
    if (
      !TOOL_REF.test(toolRef)
      || !safeInteger(trustedNowMs)
    ) {
      return Object.freeze({
        allowed: false,
        probe: false,
        reason: 'invalid_input',
        snapshot: null,
      });
    }

    const circuit =
      this.getOrCreate(
        toolRef,
        trustedNowMs,
      );

    if (trustedNowMs < circuit.updatedAtMs) {
      return Object.freeze({
        allowed: false,
        probe: false,
        reason: 'invalid_input',
        snapshot: snapshot(circuit),
      });
    }

    this.prune(circuit, trustedNowMs);

    if (
      circuit.state === 'open'
      && circuit.retryAtMs !== null
      && trustedNowMs >= circuit.retryAtMs
    ) {
      circuit.state = 'half-open';
      circuit.halfOpenAttempts = 0;
      circuit.halfOpenSuccesses = 0;
      circuit.updatedAtMs = trustedNowMs;
    }

    if (circuit.state === 'open') {
      return Object.freeze({
        allowed: false,
        probe: false,
        reason: 'circuit_open',
        snapshot: snapshot(circuit),
      });
    }

    if (circuit.state === 'half-open') {
      if (
        circuit.halfOpenAttempts
        >= this.policy.halfOpenMaxAttempts
      ) {
        return Object.freeze({
          allowed: false,
          probe: true,
          reason: 'probe_budget_exhausted',
          snapshot: snapshot(circuit),
        });
      }

      return Object.freeze({
        allowed: true,
        probe: true,
        reason: 'half_open_probe',
        snapshot: snapshot(circuit),
      });
    }

    return Object.freeze({
      allowed: true,
      probe: false,
      reason: 'allowed',
      snapshot: snapshot(circuit),
    });
  }

  recordAttemptStarted(
    toolRef: string,
    trustedNowMs: number,
  ): ToolCircuitSnapshot | null {
    if (
      !TOOL_REF.test(toolRef)
      || !safeInteger(trustedNowMs)
    ) {
      return null;
    }

    const circuit =
      this.getOrCreate(
        toolRef,
        trustedNowMs,
      );

    if (trustedNowMs < circuit.updatedAtMs) {
      return null;
    }

    if (circuit.state === 'half-open') {
      if (
        circuit.halfOpenAttempts
        >= this.policy.halfOpenMaxAttempts
      ) {
        return null;
      }

      circuit.halfOpenAttempts += 1;
    }

    circuit.updatedAtMs = trustedNowMs;
    return snapshot(circuit);
  }

  recordSuccess(
    toolRef: string,
    trustedNowMs: number,
  ): ToolCircuitSnapshot | null {
    if (
      !TOOL_REF.test(toolRef)
      || !safeInteger(trustedNowMs)
    ) {
      return null;
    }

    const circuit =
      this.getOrCreate(
        toolRef,
        trustedNowMs,
      );

    if (trustedNowMs < circuit.updatedAtMs) {
      return null;
    }

    if (circuit.state === 'half-open') {
      circuit.halfOpenSuccesses += 1;

      if (
        circuit.halfOpenSuccesses
        >= this.policy.halfOpenSuccessesToClose
      ) {
        circuit.state = 'closed';
        circuit.failures = [];
        circuit.retryAtMs = null;
        circuit.halfOpenAttempts = 0;
        circuit.halfOpenSuccesses = 0;
      }
    } else {
      circuit.failures = [];
    }

    circuit.updatedAtMs = trustedNowMs;
    return snapshot(circuit);
  }

  recordFailure(
    toolRef: string,
    trustedNowMs: number,
  ): ToolCircuitSnapshot | null {
    if (
      !TOOL_REF.test(toolRef)
      || !safeInteger(trustedNowMs)
    ) {
      return null;
    }

    const circuit =
      this.getOrCreate(
        toolRef,
        trustedNowMs,
      );

    if (trustedNowMs < circuit.updatedAtMs) {
      return null;
    }

    if (circuit.state === 'half-open') {
      circuit.state = 'open';
      circuit.failures = [trustedNowMs];
      circuit.retryAtMs =
        trustedNowMs + this.policy.cooldownMs;
      circuit.halfOpenAttempts = 0;
      circuit.halfOpenSuccesses = 0;
      circuit.updatedAtMs = trustedNowMs;
      return snapshot(circuit);
    }

    this.prune(circuit, trustedNowMs);
    circuit.failures.push(trustedNowMs);

    if (
      circuit.failures.length
      >= this.policy.failureThreshold
    ) {
      circuit.state = 'open';
      circuit.retryAtMs =
        trustedNowMs + this.policy.cooldownMs;
    }

    circuit.updatedAtMs = trustedNowMs;
    return snapshot(circuit);
  }

  getSnapshot(
    toolRef: string,
  ): ToolCircuitSnapshot | null {
    const value =
      this.circuits.get(toolRef);

    return value
      ? snapshot(value)
      : null;
  }
}
