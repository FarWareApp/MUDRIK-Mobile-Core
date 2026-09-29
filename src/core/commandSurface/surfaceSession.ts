import {
  parseCommandApprovalDecisionIntent,
  parseCommandTaskControlIntent,
} from './controlIntent';

import {
  parseCommandTaskComposerIntent,
} from './taskComposerIntent';

const BODY =
  '[a-z0-9][a-z0-9_-]{15,127}';

const SESSION_ID =
  new RegExp(
    '^surfsess_' + BODY + '$',
  );

const SURFACE_ID =
  new RegExp(
    '^surf_' + BODY + '$',
  );

export type CommandSurfaceType =
  | 'web'
  | 'mobile';

export type CommandSurfaceSession =
  Readonly<{
    protocolVersion: '1.0';
    surfaceSessionId: string;
    surfaceInstanceId: string;
    surfaceType: CommandSurfaceType;
    accountId: string;
    sourceDeviceId: string;
    authenticatedAtMs: number;
    expiresAtMs: number;
    revision: number;
    grantsAuthority: false;
  }>;

export type CommandSurfaceActionKind =
  | 'task_compose'
  | 'task_control'
  | 'approval_decision';

export type CommandSurfaceActionEnvelope =
  Readonly<{
    protocolVersion: '1.0';
    surfaceSessionId: string;
    surfaceInstanceId: string;
    surfaceType: CommandSurfaceType;
    accountId: string;
    sourceDeviceId: string;
    actionKind:
      CommandSurfaceActionKind;
    sequence: number;
    issuedAtMs: number;
    sessionRevision: number;
    grantsAuthority: false;
  }>;

const SESSION_KEYS = new Set([
  'protocolVersion',
  'surfaceSessionId',
  'surfaceInstanceId',
  'surfaceType',
  'accountId',
  'sourceDeviceId',
  'authenticatedAtMs',
  'expiresAtMs',
  'revision',
  'grantsAuthority',
]);

const ACTION_KEYS = new Set([
  'protocolVersion',
  'surfaceSessionId',
  'surfaceInstanceId',
  'surfaceType',
  'accountId',
  'sourceDeviceId',
  'actionKind',
  'sequence',
  'issuedAtMs',
  'sessionRevision',
  'grantsAuthority',
]);

const ACCOUNT_ID =
  new RegExp(
    '^acct_' + BODY + '$',
  );

const DEVICE_ID =
  new RegExp(
    '^dev_' + BODY + '$',
  );

function safeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value)
    && (value as number) >= 0
  );
}

function exactObject(
  input: unknown,
  keys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }

  const record =
    input as Record<string, unknown>;

  if (
    Object.keys(record).length
      !== keys.size
    || Object.keys(record).some(
      (key) => !keys.has(key),
    )
  ) {
    return null;
  }

  return record;
}

function surfaceType(
  value: unknown,
): value is CommandSurfaceType {
  return (
    value === 'web'
    || value === 'mobile'
  );
}

function actionKind(
  value: unknown,
): value is CommandSurfaceActionKind {
  return (
    value === 'task_compose'
    || value === 'task_control'
    || value === 'approval_decision'
  );
}

export function parseCommandSurfaceSession(
  input: unknown,
): CommandSurfaceSession | null {
  const record =
    exactObject(
      input,
      SESSION_KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.surfaceSessionId
      !== 'string'
    || !SESSION_ID.test(
      record.surfaceSessionId,
    )
    || typeof record.surfaceInstanceId
      !== 'string'
    || !SURFACE_ID.test(
      record.surfaceInstanceId,
    )
    || !surfaceType(
      record.surfaceType,
    )
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.sourceDeviceId
      !== 'string'
    || !DEVICE_ID.test(
      record.sourceDeviceId,
    )
    || !safeInteger(
      record.authenticatedAtMs,
    )
    || !safeInteger(
      record.expiresAtMs,
    )
    || record.expiresAtMs
      <= record.authenticatedAtMs
    || !safeInteger(
      record.revision,
    )
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    surfaceSessionId:
      record.surfaceSessionId,
    surfaceInstanceId:
      record.surfaceInstanceId,
    surfaceType:
      record.surfaceType,
    accountId: record.accountId,
    sourceDeviceId:
      record.sourceDeviceId,
    authenticatedAtMs:
      record.authenticatedAtMs,
    expiresAtMs:
      record.expiresAtMs,
    revision: record.revision,
    grantsAuthority: false,
  });
}

export function parseCommandSurfaceActionEnvelope(
  input: unknown,
): CommandSurfaceActionEnvelope | null {
  const record =
    exactObject(
      input,
      ACTION_KEYS,
    );

  if (
    !record
    || record.protocolVersion
      !== '1.0'
    || typeof record.surfaceSessionId
      !== 'string'
    || !SESSION_ID.test(
      record.surfaceSessionId,
    )
    || typeof record.surfaceInstanceId
      !== 'string'
    || !SURFACE_ID.test(
      record.surfaceInstanceId,
    )
    || !surfaceType(
      record.surfaceType,
    )
    || typeof record.accountId
      !== 'string'
    || !ACCOUNT_ID.test(
      record.accountId,
    )
    || typeof record.sourceDeviceId
      !== 'string'
    || !DEVICE_ID.test(
      record.sourceDeviceId,
    )
    || !actionKind(
      record.actionKind,
    )
    || !safeInteger(
      record.sequence,
    )
    || record.sequence < 1
    || !safeInteger(
      record.issuedAtMs,
    )
    || !safeInteger(
      record.sessionRevision,
    )
    || record.grantsAuthority
      !== false
  ) {
    return null;
  }

  return Object.freeze({
    protocolVersion: '1.0',
    surfaceSessionId:
      record.surfaceSessionId,
    surfaceInstanceId:
      record.surfaceInstanceId,
    surfaceType:
      record.surfaceType,
    accountId: record.accountId,
    sourceDeviceId:
      record.sourceDeviceId,
    actionKind:
      record.actionKind,
    sequence: record.sequence,
    issuedAtMs:
      record.issuedAtMs,
    sessionRevision:
      record.sessionRevision,
    grantsAuthority: false,
  });
}

function intentAccountId(
  kind: CommandSurfaceActionKind,
  intent: unknown,
): string | null {
  if (kind === 'task_compose') {
    return (
      parseCommandTaskComposerIntent(
        intent,
      )?.accountId
      ?? null
    );
  }

  if (kind === 'task_control') {
    return (
      parseCommandTaskControlIntent(
        intent,
      )?.accountId
      ?? null
    );
  }

  return (
    parseCommandApprovalDecisionIntent(
      intent,
    )?.accountId
    ?? null
  );
}

function stableFingerprint(
  envelope:
    CommandSurfaceActionEnvelope,
  intent: unknown,
): string {
  return JSON.stringify([
    envelope.surfaceSessionId,
    envelope.surfaceInstanceId,
    envelope.surfaceType,
    envelope.accountId,
    envelope.sourceDeviceId,
    envelope.actionKind,
    envelope.sequence,
    envelope.issuedAtMs,
    envelope.sessionRevision,
    intent,
  ]);
}

export type CommandSurfaceActionAdmission =
  Readonly<{
    accepted: boolean;
    duplicate: boolean;
    reason:
      | 'accepted'
      | 'duplicate'
      | 'invalid_session'
      | 'invalid_action'
      | 'session_expired'
      | 'identity_mismatch'
      | 'stale_session_revision'
      | 'time_invalid'
      | 'sequence_gap'
      | 'sequence_stale'
      | 'sequence_conflict';
    grantsAuthority: false;
  }>;

type SessionSequenceState = {
  lastSequence: number;
  lastFingerprint: string | null;
  lastIssuedAtMs: number;
};

export class CommandSurfaceActionRegistry {
  private readonly bySession =
    new Map<
      string,
      SessionSequenceState
    >();

  admit(
    sessionInput: unknown,
    envelopeInput: unknown,
    intent: unknown,
    trustedNowMs: number,
  ): CommandSurfaceActionAdmission {
    const session =
      parseCommandSurfaceSession(
        sessionInput,
      );
    const envelope =
      parseCommandSurfaceActionEnvelope(
        envelopeInput,
      );

    if (!session) {
      return this.reject(
        'invalid_session',
      );
    }

    if (!envelope) {
      return this.reject(
        'invalid_action',
      );
    }

    if (
      !safeInteger(trustedNowMs)
      || envelope.issuedAtMs
        > trustedNowMs
      || envelope.issuedAtMs
        < session.authenticatedAtMs
    ) {
      return this.reject(
        'time_invalid',
      );
    }

    if (
      trustedNowMs
        >= session.expiresAtMs
    ) {
      return this.reject(
        'session_expired',
      );
    }

    if (
      envelope.surfaceSessionId
        !== session.surfaceSessionId
      || envelope.surfaceInstanceId
        !== session.surfaceInstanceId
      || envelope.surfaceType
        !== session.surfaceType
      || envelope.accountId
        !== session.accountId
      || envelope.sourceDeviceId
        !== session.sourceDeviceId
    ) {
      return this.reject(
        'identity_mismatch',
      );
    }

    if (
      envelope.sessionRevision
        !== session.revision
    ) {
      return this.reject(
        'stale_session_revision',
      );
    }

    const accountId =
      intentAccountId(
        envelope.actionKind,
        intent,
      );

    if (!accountId) {
      return this.reject(
        'invalid_action',
      );
    }

    if (
      accountId !== session.accountId
    ) {
      return this.reject(
        'identity_mismatch',
      );
    }

    const state =
      this.bySession.get(
        session.surfaceSessionId,
      )
      ?? {
        lastSequence: 0,
        lastFingerprint: null,
        lastIssuedAtMs:
          session.authenticatedAtMs,
      };

    const fingerprint =
      stableFingerprint(
        envelope,
        intent,
      );

    if (
      envelope.sequence
        < state.lastSequence
    ) {
      return this.reject(
        'sequence_stale',
      );
    }

    if (
      envelope.sequence
        === state.lastSequence
    ) {
      if (
        state.lastFingerprint
          === fingerprint
      ) {
        return Object.freeze({
          accepted: true,
          duplicate: true,
          reason: 'duplicate',
          grantsAuthority: false,
        });
      }

      return this.reject(
        'sequence_conflict',
      );
    }

    if (
      envelope.sequence
        !== state.lastSequence + 1
    ) {
      return this.reject(
        'sequence_gap',
      );
    }

    if (
      envelope.issuedAtMs
        < state.lastIssuedAtMs
    ) {
      return this.reject(
        'time_invalid',
      );
    }

    this.bySession.set(
      session.surfaceSessionId,
      {
        lastSequence:
          envelope.sequence,
        lastFingerprint:
          fingerprint,
        lastIssuedAtMs:
          envelope.issuedAtMs,
      },
    );

    return Object.freeze({
      accepted: true,
      duplicate: false,
      reason: 'accepted',
      grantsAuthority: false,
    });
  }

  reset(
    surfaceSessionId: string,
  ): void {
    this.bySession.delete(
      surfaceSessionId,
    );
  }

  private reject(
    reason:
      Exclude<
        CommandSurfaceActionAdmission[
          'reason'
        ],
        'accepted' | 'duplicate'
      >,
  ): CommandSurfaceActionAdmission {
    return Object.freeze({
      accepted: false,
      duplicate: false,
      reason,
      grantsAuthority: false,
    });
  }
}
