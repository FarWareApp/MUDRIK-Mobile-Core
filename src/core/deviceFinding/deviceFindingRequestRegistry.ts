import {
  isFinderSessionId,
  parseDeviceFindingRequest,
} from './deviceFindingRequest';

import type {
  DeviceFindingRequest,
} from './deviceFindingRequest';

export type DeviceFindingRequestRegistryResult = Readonly<{
  accepted: boolean;
  idempotent: boolean;
  reason:
    | 'accepted'
    | 'duplicate'
    | 'invalid_request'
    | 'stale_sequence'
    | 'sequence_gap'
    | 'sequence_conflict'
    | 'request_replay';
}>;

type SessionState = {
  last: DeviceFindingRequest;
  lastFingerprint: string;
  seenRequestIds: Set<string>;
};

function fingerprint(
  request: DeviceFindingRequest,
): string {
  return JSON.stringify(request);
}

export class DeviceFindingRequestRegistry {
  private readonly sessions =
    new Map<string, SessionState>();

  apply(
    input: unknown,
  ): DeviceFindingRequestRegistryResult {
    const request =
      parseDeviceFindingRequest(input);

    if (!request) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'invalid_request',
      };
    }
    const current =
      this.sessions.get(
        request.finderSessionId,
      );

    if (!current) {
      if (request.sequence !== 0) {
        return {
          accepted: false,
          idempotent: false,
          reason: 'sequence_gap',
        };
      }

      this.sessions.set(
        request.finderSessionId,
        {
          last: request,
          lastFingerprint:
            fingerprint(request),
          seenRequestIds:
            new Set([request.requestId]),
        },
      );

      return {
        accepted: true,
        idempotent: false,
        reason: 'accepted',
      };
    }

    if (
      request.sequence
      < current.last.sequence
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'stale_sequence',
      };
    }
    if (
      request.sequence
      === current.last.sequence
    ) {
      if (
        request.requestId
          === current.last.requestId
        && fingerprint(request)
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
      request.sequence
      !== current.last.sequence + 1
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'sequence_gap',
      };
    }

    if (
      current.seenRequestIds.has(
        request.requestId,
      )
    ) {
      return {
        accepted: false,
        idempotent: false,
        reason: 'request_replay',
      };
    }
    current.last = request;
    current.lastFingerprint =
      fingerprint(request);
    current.seenRequestIds.add(
      request.requestId,
    );

    return {
      accepted: true,
      idempotent: false,
      reason: 'accepted',
    };
  }

  getLast(
    finderSessionId: string,
  ): DeviceFindingRequest | null {
    if (!isFinderSessionId(finderSessionId)) {
      return null;
    }

    return (
      this.sessions.get(
        finderSessionId,
      )?.last ?? null
    );
  }

  clearSession(
    finderSessionId: string,
  ): void {
    if (isFinderSessionId(finderSessionId)) {
      this.sessions.delete(
        finderSessionId,
      );
    }
  }

  clear(): void {
    this.sessions.clear();
  }
}
