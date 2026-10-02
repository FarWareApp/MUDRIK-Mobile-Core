import {
  parseBrainInputEnvelope,
  type BrainInputEnvelope,
} from './brainEnvelope';

import {
  BrainStreamTracker,
} from './brainStream';

export type BrainRequestRegistryResult =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason:
      | 'registered'
      | 'duplicate'
      | 'replay_conflict'
      | 'invalid_request'
      | 'capacity_exceeded';
    tracker: BrainStreamTracker | null;
  }>;

function sameRequest(
  left: BrainInputEnvelope,
  right: BrainInputEnvelope,
): boolean {
  return (
    left.protocolVersion === right.protocolVersion
    && left.requestId === right.requestId
    && left.sessionId === right.sessionId
    && left.traceId === right.traceId
    && left.conversationId === right.conversationId
    && left.workspaceId === right.workspaceId
    && left.kind === right.kind
    && left.payloadRef === right.payloadRef
    && left.languageTag === right.languageTag
    && left.createdAtMs === right.createdAtMs
    && left.deadlineAtMs === right.deadlineAtMs
    && left.transportPreference
      === right.transportPreference
    && left.requiresVerification
      === right.requiresVerification
    && left.attachmentRefs.length
      === right.attachmentRefs.length
    && left.attachmentRefs.every(
      (value, index) =>
        value === right.attachmentRefs[index],
    )
  );
}

function output(
  accepted: boolean,
  duplicate: boolean,
  reason: BrainRequestRegistryResult['reason'],
  tracker: BrainStreamTracker | null,
): BrainRequestRegistryResult {
  return Object.freeze({
    accepted,
    duplicate,
    reason,
    tracker,
  });
}

export class BrainRequestRegistry {
  private readonly requests =
    new Map<
      string,
      Readonly<{
        request: BrainInputEnvelope;
        tracker: BrainStreamTracker;
      }>
    >();

  constructor(
    private readonly maxEntries = 2048,
  ) {
    if (
      !Number.isSafeInteger(maxEntries)
      || maxEntries < 1
      || maxEntries > 100_000
    ) {
      throw new RangeError(
        'Invalid brain request registry capacity.',
      );
    }
  }

  register(
    requestInput: unknown,
  ): BrainRequestRegistryResult {
    const request =
      parseBrainInputEnvelope(requestInput);

    if (!request) {
      return output(
        false,
        false,
        'invalid_request',
        null,
      );
    }

    const existing =
      this.requests.get(request.requestId);

    if (existing) {
      return sameRequest(
        existing.request,
        request,
      )
        ? output(
            true,
            true,
            'duplicate',
            existing.tracker,
          )
        : output(
            false,
            false,
            'replay_conflict',
            null,
          );
    }

    if (this.requests.size >= this.maxEntries) {
      return output(
        false,
        false,
        'capacity_exceeded',
        null,
      );
    }

    const tracker =
      new BrainStreamTracker(request);

    this.requests.set(
      request.requestId,
      Object.freeze({
        request,
        tracker,
      }),
    );

    return output(
      true,
      false,
      'registered',
      tracker,
    );
  }

  get(
    requestId: string,
  ): BrainStreamTracker | null {
    return (
      this.requests.get(requestId)?.tracker
      ?? null
    );
  }

  release(
    requestId: string,
  ): boolean {
    const entry = this.requests.get(requestId);

    if (!entry) {
      return false;
    }

    const phase = entry.tracker.getState().phase;

    if (
      phase !== 'completed'
      && phase !== 'failed'
      && phase !== 'cancelled'
    ) {
      return false;
    }

    return this.requests.delete(requestId);
  }

  size(): number {
    return this.requests.size;
  }
}
