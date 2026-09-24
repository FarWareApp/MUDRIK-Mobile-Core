import {
  isOrchestrationSessionId,
  parseDeviceMediaIntent,
} from './deviceMediaIntent';

import type {
  NormalizedDeviceMediaIntent,
} from './deviceMediaIntent';

export type DeviceMediaIntentRegistryResult = Readonly<{
  accepted: boolean;
  idempotent: boolean;
  reason:
    | 'accepted'
    | 'duplicate'
    | 'invalid_intent'
    | 'stale_sequence'
    | 'sequence_gap'
    | 'sequence_conflict'
    | 'intent_replay';
}>;

type SessionState = {
  last: NormalizedDeviceMediaIntent;
  lastFingerprint: string;
  seenIntentIds: Set<string>;
};

function fingerprint(
  intent: NormalizedDeviceMediaIntent,
): string {
  return JSON.stringify(intent);
}

export class DeviceMediaIntentRegistry {
  private readonly sessions =
    new Map<string, SessionState>();

  apply(
    input: unknown,
  ): DeviceMediaIntentRegistryResult {
    const intent =
      parseDeviceMediaIntent(input);

    if (!intent) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'invalid_intent',
      };
    }

    const current =
      this.sessions.get(
        intent.orchestrationSessionId,
      );

    if (!current) {
      if (intent.sequence !== 0) {
        return {
          accepted: false,
          idempotent: false,
          reason: 'sequence_gap',
        };
      }

      this.sessions.set(
        intent.orchestrationSessionId,
        {
          last: intent,
          lastFingerprint:
            fingerprint(intent),
          seenIntentIds:
            new Set([intent.intentId]),
        },
      );

      return {
        accepted: true,
        idempotent: false,
        reason: 'accepted',
      };
    }

    if (intent.sequence < current.last.sequence) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'stale_sequence',
      };
    }

    if (intent.sequence === current.last.sequence) {
      if (
        intent.intentId === current.last.intentId
        && fingerprint(intent)
          === current.lastFingerprint
      ) {
        return {
          accepted: true,
          idempotent: true,
          reason: 'duplicate',
        };
      }

      return {
        accepted: false,
        idempotent: false,
        reason: 'sequence_conflict',
      };
    }

    if (
      intent.sequence
      !== current.last.sequence + 1
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'sequence_gap',
      };
    }

    if (
      current.seenIntentIds.has(
        intent.intentId,
      )
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'intent_replay',
      };
    }

    current.last = intent;
    current.lastFingerprint =
      fingerprint(intent);
    current.seenIntentIds.add(
      intent.intentId,
    );

    return {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    };
  }

  getLast(
    orchestrationSessionId: string,
  ): NormalizedDeviceMediaIntent | null {
    if (
      !isOrchestrationSessionId(
        orchestrationSessionId,
      )
    ) {
      return null;
    }

    return this.sessions.get(
      orchestrationSessionId,
    )?.last ?? null;
  }

  clearSession(
    orchestrationSessionId: string,
  ): void {
    if (
      isOrchestrationSessionId(
        orchestrationSessionId,
      )
    ) {
      this.sessions.delete(
        orchestrationSessionId,
      );
    }
  }

  clear(): void {
    this.sessions.clear();
  }
}
