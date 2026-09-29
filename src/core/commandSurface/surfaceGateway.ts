import {
  parseCommandApprovalDecisionIntent,
  parseCommandTaskControlIntent,
  type CommandApprovalDecisionIntent,
  type CommandTaskControlIntent,
} from './controlIntent';

import {
  CommandSurfaceActionRegistry,
  parseCommandSurfaceActionEnvelope,
  parseCommandSurfaceSession,
  type CommandSurfaceActionKind,
  type CommandSurfaceSession,
} from './surfaceSession';

import {
  parseCommandTaskComposerIntent,
  type CommandTaskComposerIntent,
} from './taskComposerIntent';

type NormalizedSurfaceIntent =
  | CommandTaskComposerIntent
  | CommandTaskControlIntent
  | CommandApprovalDecisionIntent;

export type CommandSurfaceRouteRequest =
  Readonly<{
    protocolVersion: '1.0';
    kind:
      CommandSurfaceActionKind;
    accountId: string;
    sourceDeviceId: string;
    surfaceSessionId: string;
    surfaceInstanceId: string;
    surfaceType:
      CommandSurfaceSession[
        'surfaceType'
      ];
    sequence: number;
    intent:
      NormalizedSurfaceIntent;
    grantsAuthority: false;
    performsExecution: false;
    createsCapabilityGrant: false;
  }>;

export type CommandSurfaceGatewayResult =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason: string;
    request:
      CommandSurfaceRouteRequest
      | null;
    grantsAuthority: false;
    performsExecution: false;
  }>;

function normalizeIntent(
  kind:
    CommandSurfaceActionKind,
  intent: unknown,
): NormalizedSurfaceIntent | null {
  if (kind === 'task_compose') {
    return parseCommandTaskComposerIntent(
      intent,
    );
  }

  if (kind === 'task_control') {
    return parseCommandTaskControlIntent(
      intent,
    );
  }

  return parseCommandApprovalDecisionIntent(
    intent,
  );
}

export class CommandSurfaceGateway {
  private readonly registry =
    new CommandSurfaceActionRegistry();

  submit(
    sessionInput: unknown,
    envelopeInput: unknown,
    intentInput: unknown,
    trustedNowMs: number,
  ): CommandSurfaceGatewayResult {
    const session =
      parseCommandSurfaceSession(
        sessionInput,
      );
    const envelope =
      parseCommandSurfaceActionEnvelope(
        envelopeInput,
      );

    if (!session || !envelope) {
      return this.reject(
        'invalid_surface_request',
      );
    }

    const normalized =
      normalizeIntent(
        envelope.actionKind,
        intentInput,
      );

    if (!normalized) {
      return this.reject(
        'invalid_surface_intent',
      );
    }

    const admitted =
      this.registry.admit(
        session,
        envelope,
        normalized,
        trustedNowMs,
      );

    if (!admitted.accepted) {
      return this.reject(
        admitted.reason,
      );
    }

    const request =
      Object.freeze({
        protocolVersion: ('1.0' as const),
        kind:
          envelope.actionKind,
        accountId:
          session.accountId,
        sourceDeviceId:
          session.sourceDeviceId,
        surfaceSessionId:
          session.surfaceSessionId,
        surfaceInstanceId:
          session.surfaceInstanceId,
        surfaceType:
          session.surfaceType,
        sequence:
          envelope.sequence,
        intent: normalized,
        grantsAuthority: (false as const),
        performsExecution: (false as const),
        createsCapabilityGrant: (false as const),
      });

    return Object.freeze({
      accepted: true,
      duplicate:
        admitted.duplicate,
      reason:
        admitted.reason,
      request,
      grantsAuthority: false,
      performsExecution: false,
    });
  }

  private reject(
    reason: string,
  ): CommandSurfaceGatewayResult {
    return Object.freeze({
      accepted: false,
      duplicate: false,
      reason,
      request: null,
      grantsAuthority: false,
      performsExecution: false,
    });
  }
}
