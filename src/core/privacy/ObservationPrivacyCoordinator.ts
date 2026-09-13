import type {
  ObservationPrivacyRepository,
  ObservationPrivacySnapshot,
} from './ObservationPrivacyRepository';
import type {
  SensorObservationController,
  SensorStopResult,
} from './SensorObservationController';
import {
  transitionObservationPrivacy,
  type ObservationPrivacyEvent,
  type ObservationPrivacyPolicyState,
  type ReactivationChecks,
} from './observationPrivacyState';

export type PrivacyCommandResultReason =
  | 'applied'
  | 'no_change'
  | 'denied'
  | 'persistence_failed_restriction_retained'
  | 'sensor_stop_incomplete'
  | 'persistence_failed_broadening_denied';

export type PrivacyCommandResult = Readonly<{
  state: ObservationPrivacyPolicyState;
  persisted: boolean;
  sensorStopConfirmed: boolean | null;
  allowed: boolean;
  reason: PrivacyCommandResultReason;
  failedSensorIds: readonly string[];
}>;

function isRestrictiveEvent(event: ObservationPrivacyEvent): boolean {
  return (
    event === 'stop_visual' ||
    event === 'stop_ambient' ||
    event === 'lock_privacy'
  );
}

function isLifecycleEvent(event: ObservationPrivacyEvent): boolean {
  return (
    event === 'app_restart' ||
    event === 'model_restart' ||
    event === 'device_handoff' ||
    event === 'room_change' ||
    event === 'new_conversation' ||
    event === 'ordinary_activity'
  );
}

function persistenceReason(event: ObservationPrivacyEvent): string {
  return `privacy_event:${event}`;
}

function requiresSensorReconciliation(
  state: ObservationPrivacyPolicyState,
  event: ObservationPrivacyEvent,
): boolean {
  return (
    state !== 'active' &&
    (isRestrictiveEvent(event) || isLifecycleEvent(event))
  );
}

export class ObservationPrivacyCoordinator {
  constructor(
    private readonly repository: ObservationPrivacyRepository,
    private readonly sensorController: SensorObservationController,
  ) {}

  async getCurrentPolicy(): Promise<ObservationPrivacySnapshot> {
    return this.repository.get();
  }

  private async stopForState(
    state: ObservationPrivacyPolicyState,
  ): Promise<SensorStopResult> {
    try {
      if (state === 'visual_off') {
        return await this.sensorController.stopPassiveVisualObservation();
      }

      if (state === 'ambient_off' || state === 'privacy_lock') {
        return await this.sensorController.stopAllPassiveObservation();
      }

      return {
        confirmed: true,
        stoppedSensorIds: [],
        failedSensorIds: [],
      };
    } catch {
      return {
        confirmed: false,
        stoppedSensorIds: [],
        failedSensorIds: [],
      };
    }
  }

  async apply(input: Readonly<{
    event: ObservationPrivacyEvent;
    nowMs: number;
    reactivationChecks?: ReactivationChecks;
  }>): Promise<PrivacyCommandResult> {
    if (!Number.isFinite(input.nowMs) || input.nowMs < 0) {
      return {
        state: 'privacy_lock',
        persisted: false,
        sensorStopConfirmed: null,
        allowed: false,
        reason: 'denied',
        failedSensorIds: [],
      };
    }

    const current = await this.repository.get();
    const transition = transitionObservationPrivacy({
      state: current.state,
      event: input.event,
      reactivationChecks: input.reactivationChecks,
    });

    if (!transition.allowed) {
      return {
        state: transition.nextState,
        persisted: current.recoveredFailClosed === false,
        sensorStopConfirmed: null,
        allowed: false,
        reason: 'denied',
        failedSensorIds: [],
      };
    }

    const restrictive = isRestrictiveEvent(input.event);

    if (restrictive) {
      let persisted = current.recoveredFailClosed === false && !transition.changed;

      if (transition.changed || current.recoveredFailClosed) {
        try {
          await this.repository.set({
            state: transition.nextState,
            reason: persistenceReason(input.event),
            updatedAtMs: input.nowMs,
          });
          persisted = true;
        } catch {
          persisted = false;
        }
      }

      const stopResult = await this.stopForState(transition.nextState);

      if (!stopResult.confirmed || stopResult.failedSensorIds.length > 0) {
        return {
          state: transition.nextState,
          persisted,
          sensorStopConfirmed: false,
          allowed: false,
          reason: 'sensor_stop_incomplete',
          failedSensorIds: Object.freeze([...stopResult.failedSensorIds]),
        };
      }

      if (!persisted) {
        return {
          state: transition.nextState,
          persisted: false,
          sensorStopConfirmed: true,
          allowed: false,
          reason: 'persistence_failed_restriction_retained',
          failedSensorIds: [],
        };
      }

      return {
        state: transition.nextState,
        persisted: true,
        sensorStopConfirmed: true,
        allowed: true,
        reason: transition.changed ? 'applied' : 'no_change',
        failedSensorIds: [],
      };
    }

    if (!transition.changed) {
      if (requiresSensorReconciliation(transition.nextState, input.event)) {
        const stopResult = await this.stopForState(transition.nextState);

        if (!stopResult.confirmed || stopResult.failedSensorIds.length > 0) {
          return {
            state: transition.nextState,
            persisted: current.recoveredFailClosed === false,
            sensorStopConfirmed: false,
            allowed: false,
            reason: 'sensor_stop_incomplete',
            failedSensorIds: Object.freeze([...stopResult.failedSensorIds]),
          };
        }

        return {
          state: transition.nextState,
          persisted: current.recoveredFailClosed === false,
          sensorStopConfirmed: true,
          allowed: true,
          reason: 'no_change',
          failedSensorIds: [],
        };
      }

      return {
        state: transition.nextState,
        persisted: current.recoveredFailClosed === false,
        sensorStopConfirmed: null,
        allowed: true,
        reason: 'no_change',
        failedSensorIds: [],
      };
    }

    try {
      await this.repository.set({
        state: transition.nextState,
        reason: persistenceReason(input.event),
        updatedAtMs: input.nowMs,
      });
    } catch {
      return {
        state: current.state,
        persisted: current.recoveredFailClosed === false,
        sensorStopConfirmed: null,
        allowed: false,
        reason: 'persistence_failed_broadening_denied',
        failedSensorIds: [],
      };
    }

    return {
      state: transition.nextState,
      persisted: true,
      sensorStopConfirmed: null,
      allowed: true,
      reason: 'applied',
      failedSensorIds: [],
    };
  }
}
