import {
  evaluateDeviceFindingSignalTime,
  isDeviceFindingSignalId,
  parseDeviceFindingSignal,
} from './deviceFindingSignal';

import type {
  DeviceFindingSignal,
  DeviceFindingSignalFreshness,
} from './deviceFindingSignal';

export type DeviceFindingSignalRegistryResult = Readonly<{
  accepted: boolean;
  idempotent: boolean;
  freshness: DeviceFindingSignalFreshness | null;
  reason:
    | 'accepted'
    | 'duplicate'
    | 'invalid_signal'
    | 'invalid_time'
    | 'future_signal'
    | 'expired_signal'
    | 'stale_sequence'
    | 'sequence_gap'
    | 'sequence_conflict'
    | 'cross_session_replay'
    | 'signal_binding_conflict';
}>;

type SignalState = {
  last: DeviceFindingSignal;
  lastFingerprint: string;
  freshness: DeviceFindingSignalFreshness;
};

type SignalBinding = Readonly<{
  finderSessionId: string;
  targetDeviceId: string;
  component: string;
  kind: string;
}>;

function fingerprint(
  signal: DeviceFindingSignal,
): string {
  return JSON.stringify(signal);
}

function bindingFor(
  signal: DeviceFindingSignal,
): SignalBinding {
  return Object.freeze({
    finderSessionId:
      signal.finderSessionId,
    targetDeviceId:
      signal.targetDeviceId,
    component:
      signal.component,
    kind:
      signal.kind,
  });
}

function sameBinding(
  a: SignalBinding,
  b: SignalBinding,
): boolean {
  return (
    a.finderSessionId === b.finderSessionId
    && a.targetDeviceId === b.targetDeviceId
    && a.component === b.component
    && a.kind === b.kind
  );
}

export class DeviceFindingSignalRegistry {
  private readonly states =
    new Map<string, SignalState>();

  private readonly bindings =
    new Map<string, SignalBinding>();

  apply(
    input: unknown,
    trustedEvaluationTimeMs: unknown,
  ): DeviceFindingSignalRegistryResult {
    const signal =
      parseDeviceFindingSignal(input);

    if (!signal) {
      return {
        accepted: false,
        idempotent: false,
        freshness: null,
        reason: 'invalid_signal',
      };
    }

    const time =
      evaluateDeviceFindingSignalTime(
        signal,
        trustedEvaluationTimeMs,
      );

    if (!time.accepted) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason:
          time.freshness === 'invalid_time'
            ? 'invalid_time'
            : time.freshness === 'future'
              ? 'future_signal'
              : 'expired_signal',
      };
    }

    const nextBinding =
      bindingFor(signal);
    const existingBinding =
      this.bindings.get(
        signal.signalId,
      );

    if (
      existingBinding
      && !sameBinding(
        existingBinding,
        nextBinding,
      )
    ) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason:
          existingBinding.finderSessionId
            !== signal.finderSessionId
            ? 'cross_session_replay'
            : 'signal_binding_conflict',
      };
    }

    const current =
      this.states.get(
        signal.signalId,
      );

    if (!current) {
      if (signal.sequence !== 0) {
        return {
          accepted: false,
          idempotent: false,
          freshness: time.freshness,
          reason: 'sequence_gap',
        };
      }

      this.bindings.set(
        signal.signalId,
        nextBinding,
      );
      this.states.set(
        signal.signalId,
        {
          last: signal,
          lastFingerprint:
            fingerprint(signal),
          freshness: time.freshness,
        },
      );

      return {
        accepted: true,
        idempotent: false,
        freshness: time.freshness,
        reason: 'accepted',
      };
    }

    if (
      signal.sequence
        < current.last.sequence
    ) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason: 'stale_sequence',
      };
    }

    if (
      signal.sequence
        === current.last.sequence
    ) {
      if (
        fingerprint(signal)
          === current.lastFingerprint
      ) {
        return {
          accepted: true,
          idempotent: true,
          freshness:
            current.freshness,
          reason: 'duplicate',
        };
      }

      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason: 'sequence_conflict',
      };
    }

    if (
      signal.sequence
        !== current.last.sequence + 1
    ) {
      return {
        accepted: false,
        idempotent: false,
        freshness: time.freshness,
        reason: 'sequence_gap',
      };
    }

    current.last = signal;
    current.lastFingerprint =
      fingerprint(signal);
    current.freshness =
      time.freshness;

    return {
      accepted: true,
      idempotent: false,
      freshness: time.freshness,
      reason: 'accepted',
    };
  }

  getLast(
    signalId: string,
  ): Readonly<{
    signal: DeviceFindingSignal;
    freshness: DeviceFindingSignalFreshness;
  }> | null {
    if (!isDeviceFindingSignalId(signalId)) {
      return null;
    }

    const state =
      this.states.get(signalId);

    return state
      ? Object.freeze({
          signal: state.last,
          freshness:
            state.freshness,
        })
      : null;
  }

  listForSession(
    finderSessionId: string,
  ): readonly Readonly<{
    signal: DeviceFindingSignal;
    freshness: DeviceFindingSignalFreshness;
  }>[] {
    const values = [
      ...this.states.values(),
    ]
      .filter(
        (state) =>
          state.last.finderSessionId
            === finderSessionId,
      )
      .map(
        (state) => Object.freeze({
          signal: state.last,
          freshness:
            state.freshness,
        }),
      );

    return Object.freeze(values);
  }

  clear(): void {
    this.states.clear();
    this.bindings.clear();
  }
}
