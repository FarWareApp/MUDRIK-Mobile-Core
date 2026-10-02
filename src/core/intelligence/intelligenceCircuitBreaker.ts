import {
  INTELLIGENCE_MODEL_REF,
  INTELLIGENCE_PROVIDER_REF,
  safeInteger,
} from './intelligenceSecurity';

import type {
  IntelligenceFailureCode,
} from './intelligenceFailover';

export type IntelligenceCircuitBreakerPolicy =
  Readonly<{
    failureThreshold: number;
    failureWindowMs: number;
    cooldownMs: number;
    halfOpenMaxAttempts: number;
    halfOpenSuccessesToClose: number;
  }>;

export type IntelligenceCircuitState =
  | 'closed'
  | 'open'
  | 'half-open';

export type IntelligenceCircuitSnapshot =
  Readonly<{
    providerRef: string;
    modelRef: string;
    state: IntelligenceCircuitState;
    failureCount: number;
    retryAtMs: number | null;
    halfOpenAttempts: number;
    halfOpenSuccesses: number;
    updatedAtMs: number;
  }>;

export type IntelligenceCircuitAdmission =
  Readonly<{
    allowed: boolean;
    probe: boolean;
    reason:
      | 'allowed'
      | 'half_open_probe'
      | 'circuit_open'
      | 'probe_budget_exhausted'
      | 'invalid_input';
    snapshot: IntelligenceCircuitSnapshot | null;
  }>;

const PROVIDER_FAILURES =
  new Set<IntelligenceFailureCode>([
    'network_unavailable',
    'provider_unavailable',
    'timeout',
    'rate_limited',
    'invalid_response',
    'unknown',
  ]);

function validPolicy(
  policy: IntelligenceCircuitBreakerPolicy,
): boolean {
  return (
    safeInteger(policy.failureThreshold)
    && policy.failureThreshold >= 1
    && policy.failureThreshold <= 20
    && safeInteger(policy.failureWindowMs)
    && policy.failureWindowMs >= 1000
    && policy.failureWindowMs <= 60 * 60 * 1000
    && safeInteger(policy.cooldownMs)
    && policy.cooldownMs >= 1000
    && policy.cooldownMs <= 60 * 60 * 1000
    && safeInteger(policy.halfOpenMaxAttempts)
    && policy.halfOpenMaxAttempts >= 1
    && policy.halfOpenMaxAttempts <= 8
    && safeInteger(policy.halfOpenSuccessesToClose)
    && policy.halfOpenSuccessesToClose >= 1
    && policy.halfOpenSuccessesToClose
      <= policy.halfOpenMaxAttempts
  );
}

function key(
  providerRef: string,
  modelRef: string,
): string {
  return providerRef + ':' + modelRef;
}

type MutableCircuit = {
  providerRef: string;
  modelRef: string;
  state: IntelligenceCircuitState;
  failures: number[];
  retryAtMs: number | null;
  halfOpenAttempts: number;
  halfOpenSuccesses: number;
  updatedAtMs: number;
};

function snapshot(
  value: MutableCircuit,
): IntelligenceCircuitSnapshot {
  return Object.freeze({
    providerRef: value.providerRef,
    modelRef: value.modelRef,
    state: value.state,
    failureCount: value.failures.length,
    retryAtMs: value.retryAtMs,
    halfOpenAttempts: value.halfOpenAttempts,
    halfOpenSuccesses: value.halfOpenSuccesses,
    updatedAtMs: value.updatedAtMs,
  });
}

function validIdentity(
  providerRef: string,
  modelRef: string,
): boolean {
  return (
    INTELLIGENCE_PROVIDER_REF.test(providerRef)
    && INTELLIGENCE_MODEL_REF.test(modelRef)
  );
}

export class IntelligenceCircuitBreakerRegistry {
  private readonly circuits =
    new Map<string, MutableCircuit>();

  constructor(
    private readonly policy:
      IntelligenceCircuitBreakerPolicy,
  ) {
    if (!validPolicy(policy)) {
      throw new TypeError(
        'Invalid intelligence circuit-breaker policy.',
      );
    }
  }

  private getOrCreate(
    providerRef: string,
    modelRef: string,
    trustedNowMs: number,
  ): MutableCircuit {
    const circuitKey = key(providerRef, modelRef);
    const existing = this.circuits.get(circuitKey);

    if (existing) {
      return existing;
    }

    const created: MutableCircuit = {
      providerRef,
      modelRef,
      state: 'closed',
      failures: [],
      retryAtMs: null,
      halfOpenAttempts: 0,
      halfOpenSuccesses: 0,
      updatedAtMs: trustedNowMs,
    };

    this.circuits.set(circuitKey, created);
    return created;
  }

  private pruneFailures(
    circuit: MutableCircuit,
    trustedNowMs: number,
  ): void {
    const cutoff =
      trustedNowMs - this.policy.failureWindowMs;

    circuit.failures =
      circuit.failures.filter(
        (timestamp) => timestamp >= cutoff,
      );
  }

  admit(
    providerRef: string,
    modelRef: string,
    trustedNowMs: number,
  ): IntelligenceCircuitAdmission {
    if (
      !validIdentity(providerRef, modelRef)
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
        providerRef,
        modelRef,
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

    this.pruneFailures(circuit, trustedNowMs);

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
    providerRef: string,
    modelRef: string,
    trustedNowMs: number,
  ): IntelligenceCircuitSnapshot | null {
    if (
      !validIdentity(providerRef, modelRef)
      || !safeInteger(trustedNowMs)
    ) {
      return null;
    }

    const circuit =
      this.getOrCreate(
        providerRef,
        modelRef,
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
    providerRef: string,
    modelRef: string,
    trustedNowMs: number,
  ): IntelligenceCircuitSnapshot | null {
    if (
      !validIdentity(providerRef, modelRef)
      || !safeInteger(trustedNowMs)
    ) {
      return null;
    }

    const circuit =
      this.getOrCreate(
        providerRef,
        modelRef,
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
    } else if (circuit.state === 'closed') {
      circuit.failures = [];
    }

    circuit.updatedAtMs = trustedNowMs;
    return snapshot(circuit);
  }

  recordFailure(
    providerRef: string,
    modelRef: string,
    failureCode: IntelligenceFailureCode,
    trustedNowMs: number,
  ): IntelligenceCircuitSnapshot | null {
    if (
      !validIdentity(providerRef, modelRef)
      || !safeInteger(trustedNowMs)
    ) {
      return null;
    }

    const circuit =
      this.getOrCreate(
        providerRef,
        modelRef,
        trustedNowMs,
      );

    if (trustedNowMs < circuit.updatedAtMs) {
      return null;
    }

    if (!PROVIDER_FAILURES.has(failureCode)) {
      circuit.updatedAtMs = trustedNowMs;
      return snapshot(circuit);
    }

    this.pruneFailures(circuit, trustedNowMs);

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

    if (circuit.state === 'open') {
      circuit.updatedAtMs = trustedNowMs;
      return snapshot(circuit);
    }

    circuit.failures.push(trustedNowMs);

    if (
      circuit.failures.length
      >= this.policy.failureThreshold
    ) {
      circuit.state = 'open';
      circuit.retryAtMs =
        trustedNowMs + this.policy.cooldownMs;
      circuit.halfOpenAttempts = 0;
      circuit.halfOpenSuccesses = 0;
    }

    circuit.updatedAtMs = trustedNowMs;
    return snapshot(circuit);
  }

  getSnapshot(
    providerRef: string,
    modelRef: string,
  ): IntelligenceCircuitSnapshot | null {
    if (!validIdentity(providerRef, modelRef)) {
      return null;
    }

    const value =
      this.circuits.get(
        key(providerRef, modelRef),
      );

    return value ? snapshot(value) : null;
  }
}

export const DEFAULT_INTELLIGENCE_CIRCUIT_BREAKER_POLICY =
  Object.freeze({
    failureThreshold: 3,
    failureWindowMs: 60_000,
    cooldownMs: 30_000,
    halfOpenMaxAttempts: 2,
    halfOpenSuccessesToClose: 2,
  } satisfies IntelligenceCircuitBreakerPolicy);
