import {
  openEmergencySession,
} from './emergencySession';

import {
  isEmergencySessionId,
} from './emergencyEvidence';

import type {
  EmergencySession,
  EmergencySessionOpenResult,
} from './emergencySession';

export type EmergencySessionRegistryResult =
  Readonly<{
    accepted: boolean;
    idempotent: boolean;
    session: EmergencySession | null;
    reason:
      | EmergencySessionOpenResult['reason']
      | 'duplicate'
      | 'session_conflict'
      | 'session_replay';
    grantsAuthority: false;
  }>;

type SessionState = {
  session: EmergencySession;
  bindingFingerprint: string;
};

const registeredEmergencySessions =
  new WeakSet<object>();

export function isRegisteredEmergencySession(
  value: unknown,
): value is EmergencySession {
  return (
    typeof value === 'object'
    && value !== null
    && registeredEmergencySessions.has(
      value,
    )
  );
}

function bindingFingerprint(
  session: EmergencySession,
): string {
  return JSON.stringify({
    emergencySessionId:
      session.emergencySessionId,
    accountId: session.accountId,
    sourceDeviceId:
      session.sourceDeviceId,
    configId: session.configId,
    configRevision:
      session.configRevision,
    mode: session.mode,
    simulationOnly:
      session.simulationOnly,
  });
}

function result(
  accepted: boolean,
  idempotent: boolean,
  session: EmergencySession | null,
  reason:
    EmergencySessionRegistryResult['reason'],
): EmergencySessionRegistryResult {
  return Object.freeze({
    accepted,
    idempotent,
    session,
    reason,
    grantsAuthority: false,
  });
}

export class EmergencySessionRegistry {
  private readonly sessions =
    new Map<string, SessionState>();

  private readonly retiredSessionIds =
    new Set<string>();

  open(
    input: unknown,
    trustedEvaluationTimeInput: unknown,
  ): EmergencySessionRegistryResult {
    const opened =
      openEmergencySession(
        input,
        trustedEvaluationTimeInput,
      );

    if (!opened.accepted || !opened.session) {
      return result(
        false,
        false,
        null,
        opened.reason,
      );
    }

    const candidate = opened.session;

    if (
      this.retiredSessionIds.has(
        candidate.emergencySessionId,
      )
    ) {
      return result(
        false,
        false,
        null,
        'session_replay',
      );
    }

    const fingerprint =
      bindingFingerprint(candidate);
    const current =
      this.sessions.get(
        candidate.emergencySessionId,
      );

    if (!current) {
      this.sessions.set(
        candidate.emergencySessionId,
        {
          session: candidate,
          bindingFingerprint:
            fingerprint,
        },
      );
      registeredEmergencySessions.add(
        candidate,
      );

      return result(
        true,
        false,
        candidate,
        'accepted',
      );
    }

    if (
      current.bindingFingerprint
        === fingerprint
    ) {
      return result(
        true,
        true,
        current.session,
        'duplicate',
      );
    }

    return result(
      false,
      false,
      null,
      'session_conflict',
    );
  }

  get(
    emergencySessionId: string,
  ): EmergencySession | null {
    if (
      !isEmergencySessionId(
        emergencySessionId,
      )
    ) {
      return null;
    }

    return (
      this.sessions.get(
        emergencySessionId,
      )?.session ?? null
    );
  }

  clearSession(
    emergencySessionId: string,
  ): void {
    if (
      isEmergencySessionId(
        emergencySessionId,
      )
    ) {
      const current =
        this.sessions.get(
          emergencySessionId,
        );

      if (!current) {
        return;
      }

      registeredEmergencySessions.delete(
        current.session,
      );
      this.sessions.delete(
        emergencySessionId,
      );
      this.retiredSessionIds.add(
        emergencySessionId,
      );
    }
  }

  clear(): void {
    for (
      const [
        emergencySessionId,
        state,
      ] of this.sessions
    ) {
      registeredEmergencySessions.delete(
        state.session,
      );
      this.retiredSessionIds.add(
        emergencySessionId,
      );
    }

    this.sessions.clear();
  }
}
