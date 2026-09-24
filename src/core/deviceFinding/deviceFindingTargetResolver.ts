import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  isIdentityId,
} from '../identity/identityIds';

import {
  capabilityForDeviceFindingRequest,
} from './deviceFindingCapability';

import {
  normalizeDeviceAlias,
  parseDeviceFindingRequest,
} from './deviceFindingRequest';

import type {
  DeviceFindingComponent,
  DeviceFindingRequest,
  DeviceFindingRequestKind,
} from './deviceFindingRequest';

export type DeviceFindingTargetAction =
  | 'locate'
  | 'ring'
  | 'guidance';

export type DeviceFindingOnlineState =
  | 'online'
  | 'offline'
  | 'unknown';

type ParsedCandidate = Readonly<{
  deviceId: string;
  aliases: readonly string[];
  components: readonly DeviceFindingComponent[];
  supportedActions: readonly DeviceFindingTargetAction[];
  onlineState: DeviceFindingOnlineState;
  deviceTrustInput: unknown;
}>;

export type DeviceFindingTargetResolution = Readonly<{
  selectedDeviceId: string | null;
  requiredCapability: string | null;
  reason:
    | 'selected_by_device_id'
    | 'selected_by_alias'
    | 'clarification_required'
    | 'target_ineligible'
    | 'no_match'
    | 'invalid_input';
  grantsAuthority: false;
}>;

const INPUT_KEYS = new Set([
  'accountId',
  'request',
  'candidates',
]);

const CANDIDATE_KEYS = new Set([
  'deviceId',
  'aliases',
  'components',
  'supportedActions',
  'onlineState',
  'deviceTrustInput',
]);

const ACTIONS: readonly DeviceFindingTargetAction[] = [
  'locate',
  'ring',
  'guidance',
];

const COMPONENTS: readonly DeviceFindingComponent[] = [
  'whole',
  'left',
  'right',
  'case',
];

const ONLINE_STATES:
  readonly DeviceFindingOnlineState[] = [
    'online',
    'offline',
    'unknown',
  ];
function result(
  selectedDeviceId: string | null,
  requiredCapability: string | null,
  reason: DeviceFindingTargetResolution['reason'],
): DeviceFindingTargetResolution {
  return Object.freeze({
    selectedDeviceId,
    requiredCapability,
    reason,
    grantsAuthority: false,
  });
}

function actionForRequest(
  kind: DeviceFindingRequestKind,
): DeviceFindingTargetAction {
  if (kind === 'device.ring') {
    return 'ring';
  }

  if (kind === 'device.guidance') {
    return 'guidance';
  }

  return 'locate';
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

function parseStringSet<T extends string>(
  value: unknown,
  allowed: readonly T[],
  maximum: number,
): readonly T[] | null {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.length > maximum
  ) {
    return null;
  }

  const parsed: T[] = [];
  const seen = new Set<T>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !allowed.includes(item as T)
      || seen.has(item as T)
    ) {
      return null;
    }

    const typed = item as T;
    seen.add(typed);
    parsed.push(typed);
  }

  return Object.freeze(parsed);
}
function parseCandidate(
  input: unknown,
): ParsedCandidate | null {
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
      !== CANDIDATE_KEYS.size
    || Object.keys(record).some(
      (key) => !CANDIDATE_KEYS.has(key),
    )
    || !isIdentityId(
      'device',
      record.deviceId,
    )
    || !Array.isArray(record.aliases)
    || record.aliases.length > 8
    || typeof record.onlineState !== 'string'
    || !ONLINE_STATES.includes(
      record.onlineState as DeviceFindingOnlineState,
    )
  ) {
    return null;
  }

  const aliases: string[] = [];
  const seenAliases = new Set<string>();

  for (const rawAlias of record.aliases) {
    const alias =
      normalizeDeviceAlias(rawAlias);

    if (!alias || seenAliases.has(alias)) {
      return null;
    }

    seenAliases.add(alias);
    aliases.push(alias);
  }

  const components =
    parseStringSet(
      record.components,
      COMPONENTS,
      COMPONENTS.length,
    );

  const supportedActions =
    parseStringSet(
      record.supportedActions,
      ACTIONS,
      ACTIONS.length,
    );

  if (!components || !supportedActions) {
    return null;
  }

  return Object.freeze({
    deviceId: record.deviceId,
    aliases: Object.freeze(aliases),
    components,
    supportedActions,
    onlineState:
      record.onlineState as DeviceFindingOnlineState,
    deviceTrustInput:
      record.deviceTrustInput,
  });
}
function isCandidateEligible(
  accountId: string,
  request: DeviceFindingRequest,
  candidate: ParsedCandidate,
): boolean {
  const action =
    actionForRequest(request.kind);

  if (
    !trustBindingMatches(
      candidate.deviceTrustInput,
      accountId,
      candidate.deviceId,
    )
    || !candidate.supportedActions.includes(
      action,
    )
    || !candidate.components.includes(
      request.component,
    )
  ) {
    return false;
  }

  if (
    action === 'ring'
    && candidate.onlineState !== 'online'
  ) {
    return false;
  }

  return true;
}

export function resolveDeviceFindingTarget(
  input: unknown,
): DeviceFindingTargetResolution {
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return result(
      null,
      null,
      'invalid_input',
    );
  }

  const record =
    input as Record<string, unknown>;
  const accountId = record.accountId;

  if (
    Object.keys(record).length
      !== INPUT_KEYS.size
    || Object.keys(record).some(
      (key) => !INPUT_KEYS.has(key),
    )
    || !isIdentityId(
      'account',
      accountId,
    )
    || !Array.isArray(record.candidates)
    || record.candidates.length === 0
    || record.candidates.length > 64
  ) {
    return result(
      null,
      null,
      'invalid_input',
    );
  }

  const request =
    parseDeviceFindingRequest(
      record.request,
    );

  if (!request) {
    return result(
      null,
      null,
      'invalid_input',
    );
  }
  const candidates: ParsedCandidate[] = [];
  const seenDeviceIds = new Set<string>();

  for (const rawCandidate of record.candidates) {
    const candidate =
      parseCandidate(rawCandidate);

    if (
      !candidate
      || seenDeviceIds.has(
        candidate.deviceId,
      )
    ) {
      return result(
        null,
        null,
        'invalid_input',
      );
    }

    seenDeviceIds.add(
      candidate.deviceId,
    );
    candidates.push(candidate);
  }

  const requiredCapability =
    capabilityForDeviceFindingRequest(
      request.kind,
    );

  if (request.targetDeviceId) {
    const exact =
      candidates.find(
        (candidate) =>
          candidate.deviceId
            === request.targetDeviceId,
      );

    if (
      !exact
      || !isCandidateEligible(
        accountId,
        request,
        exact,
      )
    ) {
      return result(
        null,
        requiredCapability,
        'target_ineligible',
      );
    }

    return result(
      exact.deviceId,
      requiredCapability,
      'selected_by_device_id',
    );
  }

  const alias =
    request.targetAlias!;

  const aliasMatches =
    candidates.filter(
      (candidate) =>
        candidate.aliases.includes(alias),
    );

  if (aliasMatches.length === 0) {
    return result(
      null,
      requiredCapability,
      'no_match',
    );
  }

  const eligible =
    aliasMatches.filter(
      (candidate) =>
        isCandidateEligible(
          accountId,
          request,
          candidate,
        ),
    );

  if (eligible.length === 0) {
    return result(
      null,
      requiredCapability,
      'target_ineligible',
    );
  }

  if (eligible.length > 1) {
    return result(
      null,
      requiredCapability,
      'clarification_required',
    );
  }

  return result(
    eligible[0].deviceId,
    requiredCapability,
    'selected_by_alias',
  );
}
