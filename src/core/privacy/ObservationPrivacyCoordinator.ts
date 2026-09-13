import type {
  ObservationPrivacyRepository,
  ObservationPrivacySnapshot,
} from './ObservationPrivacyRepository';
import type { SensorObservationController } from './SensorObservationController';
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

function persistenceReason(event: ObservationPrivacyEvent): string {
  return `privacy_event:${event}`;
}

export class ObservationPrivacyCoordinator {
  constructor(
    private readonly repository: ObservationPrivacyRepository,
    private readonly sensorController: SensorObservationController,
  ) {}

  async getCurrentPolicy(): Promise<ObservationPrivacySnapshot> {
    return this.repository.get();
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

    if (!transition.changed) {
      return {
        state: transition.nextState,
        persisted: current.recoveredFailClosed === false,
        sensorStopConfirmed: null,
        allowed: true,
        reason: 'no_change',
        failedSensorIds: [],
      };
    }

    if (isRestrictiveEvent(input.event)) {
      let persisted = false;
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

      let stopResult;
      try {
        stopResult =
          input.event === 'stop_visual'
            ? await this.sensorController.stopPassiveVisualObservation()
            : await this.sensorController.stopAllPassiveObservation();
      } catch {
        stopResult = {
          confirmed: false,
          stoppedSensorIds: [],
          failedSensorIds: [],
        } as const;
      }

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
        reason: 'applied',
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
