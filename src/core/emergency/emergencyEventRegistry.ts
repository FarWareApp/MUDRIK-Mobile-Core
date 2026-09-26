import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  isEmergencyGuardianSessionState,
} from './emergencyGuardianSessionState';

import {
  parseEmergencyUserEvent,
} from './emergencyEvent';

import type {
  EmergencyUserEvent,
} from './emergencyEvent';

export type AcceptedEmergencyUserEvent =
  EmergencyUserEvent & Readonly<{
    acceptedAtMs: number;
  }>;

export type EmergencyEventRegistryResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    event: AcceptedEmergencyUserEvent | null;
    reason:
      | 'accepted'
      | 'duplicate'
      | 'invalid_input'
      | 'session_mismatch'
      | 'account_mismatch'
      | 'generation_mismatch'
      | 'source_untrusted'
      | 'non_monotonic_time'
      | 'stale_sequence'
      | 'sequence_gap'
      | 'sequence_conflict'
      | 'event_replay'
      | 'cross_session_replay'
      | 'cross_generation_replay';
    grantsAuthority: false;
    performsExternalAction: false;
  }>;

type StreamState = {
  last: AcceptedEmergencyUserEvent;
  lastFingerprint: string;
  seenEventIds: Set<string>;
};

type EventBinding = Readonly<{
  emergencySessionId: string;
  accountId: string;
  sourceDeviceId: string;
  generation: number;
}>;

const registryAcceptedEvents =
  new WeakSet<object>();

const INPUT_KEYS = new Set([
  'sessionState',
  'sourceDeviceTrustInput',
  'event',
]);

function eventFingerprint(
  event: EmergencyUserEvent,
): string {
  return JSON.stringify(event);
}

function streamKey(
  accountId: string,
  emergencySessionId: string,
  generation: number,
): string {
  return (
    accountId
    + ':'
    + emergencySessionId
    + ':'
    + String(generation)
  );
}

function bindingFor(
  event: EmergencyUserEvent,
): EventBinding {
  return Object.freeze({
    emergencySessionId:
      event.emergencySessionId,
    accountId: event.accountId,
    sourceDeviceId:
      event.sourceDeviceId,
    generation: event.generation,
  });
}

function trustBindingMatches(
  input: unknown,
  accountId: string,
  deviceId: string,
): boolean {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return false;
  }

  const record =
    input as Record<string, unknown>;

  return (
    record.expectedAccountId === accountId
    && record.expectedDeviceId === deviceId
    && evaluateDeviceTrust(input).trusted
  );
}

function result(
  accepted: boolean,
  idempotent: boolean,
  event: AcceptedEmergencyUserEvent | null,
  reason: EmergencyEventRegistryResult['reason'],
): EmergencyEventRegistryResult {
  return Object.freeze({
    accepted,
    idempotent,
    event,
    reason,
    grantsAuthority: false,
    performsExternalAction: false,
  });
}

function acceptedEvent(
  event: EmergencyUserEvent,
  acceptedAtMs: number,
): AcceptedEmergencyUserEvent {
  const canonical =
    Object.freeze({
      ...event,
      acceptedAtMs,
    });

  registryAcceptedEvents.add(
    canonical,
  );

  return canonical;
}

export function isRegistryAcceptedEmergencyUserEvent(
  value: unknown,
): value is AcceptedEmergencyUserEvent {
  return (
    typeof value === 'object'
    && value !== null
    && registryAcceptedEvents.has(value)
  );
}

export class EmergencyEventRegistry {
  private readonly streams =
    new Map<string, StreamState>();

  private readonly eventBindings =
    new Map<string, EventBinding>();

  apply(
    input: unknown,
    trustedEvaluationTimeInput: unknown,
  ): EmergencyEventRegistryResult {
    const nowMs =
      parseTrustedEvaluationTime(
        trustedEvaluationTimeInput,
      );

    if (
      nowMs === null
      || typeof input !== 'object'
      || input === null
      || Array.isArray(input)
    ) {
      return result(
        false,
        false,
        null,
        'invalid_input',
      );
    }

    const record =
      input as Record<string, unknown>;

    if (
      Object.keys(record).length
        !== INPUT_KEYS.size
      || Object.keys(record).some(
        (key) => !INPUT_KEYS.has(key),
      )
      || !isEmergencyGuardianSessionState(
        record.sessionState,
      )
    ) {
      return result(
        false,
        false,
        null,
        'invalid_input',
      );
    }

    const sessionState =
      record.sessionState;
    const session =
      sessionState.session;
    const state =
      sessionState.state;
    const event =
      parseEmergencyUserEvent(
        record.event,
      );

    if (!event) {
      return result(
        false,
        false,
        null,
        'invalid_input',
      );
    }

    if (
      event.emergencySessionId
        !== session.emergencySessionId
    ) {
      return result(
        false,
        false,
        null,
        'session_mismatch',
      );
    }

    if (
      event.accountId
        !== session.accountId
    ) {
      return result(
        false,
        false,
        null,
        'account_mismatch',
      );
    }

    if (
      event.generation
        !== state.generation
    ) {
      return result(
        false,
        false,
        null,
        'generation_mismatch',
      );
    }

    if (
      !trustBindingMatches(
        record.sourceDeviceTrustInput,
        event.accountId,
        event.sourceDeviceId,
      )
    ) {
      return result(
        false,
        false,
        null,
        'source_untrusted',
      );
    }

    const nextBinding =
      bindingFor(event);
    const existingBinding =
      this.eventBindings.get(
        event.eventId,
      );

    if (existingBinding) {
      if (
        existingBinding.emergencySessionId
          !== event.emergencySessionId
      ) {
        return result(
          false,
          false,
          null,
          'cross_session_replay',
        );
      }

      if (
        existingBinding.generation
          !== event.generation
      ) {
        return result(
          false,
          false,
          null,
          'cross_generation_replay',
        );
      }

      if (
        existingBinding.accountId
          !== event.accountId
        || existingBinding.sourceDeviceId
          !== event.sourceDeviceId
      ) {
        return result(
          false,
          false,
          null,
          'event_replay',
        );
      }
    }

    const key =
      streamKey(
        event.accountId,
        event.emergencySessionId,
        event.generation,
      );
    const current =
      this.streams.get(key);
    const fingerprint =
      eventFingerprint(event);

    if (
      current
      && nowMs < current.last.acceptedAtMs
    ) {
      return result(
        false,
        false,
        null,
        'non_monotonic_time',
      );
    }

    if (!current) {
      if (event.sequence !== 0) {
        return result(
          false,
          false,
          null,
          'sequence_gap',
        );
      }

      const canonical =
        acceptedEvent(event, nowMs);

      this.eventBindings.set(
        event.eventId,
        nextBinding,
      );
      this.streams.set(
        key,
        {
          last: canonical,
          lastFingerprint: fingerprint,
          seenEventIds:
            new Set([event.eventId]),
        },
      );

      return result(
        true,
        false,
        canonical,
        'accepted',
      );
    }

    if (
      event.sequence
        < current.last.sequence
    ) {
      return result(
        false,
        false,
        null,
        'stale_sequence',
      );
    }

    if (
      event.sequence
        === current.last.sequence
    ) {
      if (
        event.eventId
          === current.last.eventId
        && fingerprint
          === current.lastFingerprint
      ) {
        return result(
          true,
          true,
          current.last,
          'duplicate',
        );
      }

      return result(
        false,
        false,
        null,
        'sequence_conflict',
      );
    }

    if (
      event.sequence
        !== current.last.sequence + 1
    ) {
      return result(
        false,
        false,
        null,
        'sequence_gap',
      );
    }

    if (
      current.seenEventIds.has(
        event.eventId,
      )
      || existingBinding
    ) {
      return result(
        false,
        false,
        null,
        'event_replay',
      );
    }

    const canonical =
      acceptedEvent(event, nowMs);

    current.last = canonical;
    current.lastFingerprint = fingerprint;
    current.seenEventIds.add(
      event.eventId,
    );
    this.eventBindings.set(
      event.eventId,
      nextBinding,
    );

    return result(
      true,
      false,
      canonical,
      'accepted',
    );
  }

}
