import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  isIdentityId,
} from '../identity/identityIds';

import {
  parseTrustedEvaluationTime,
} from '../security/trustedEvaluationTime';

import {
  capabilityForDeviceMediaIntent,
} from './deviceMediaCapability';

import {
  parseDeviceMediaAdapterDescriptor,
} from './deviceMediaAdapterContract';

import type {
  DeviceMediaAdapterDescriptor,
} from './deviceMediaAdapterContract';

import {
  parseDeviceMediaIntent,
} from './deviceMediaIntent';

import type {
  NormalizedDeviceMediaIntent,
} from './deviceMediaIntent';

export type DeviceMediaTargetResolutionReason =
  | 'explicit_target_selected'
  | 'context_target_selected'
  | 'clarification_required'
  | 'explicit_target_ineligible'
  | 'no_eligible_target'
  | 'invalid_input';

export type DeviceMediaTargetResolution = Readonly<{
  selectedDeviceId: string | null;
  selectedAdapterId: string | null;
  requiredCapability: string | null;
  reason: DeviceMediaTargetResolutionReason;
  grantsAuthority: false;
}>;

type CandidateInput = Readonly<{
  adapter: unknown;
  deviceTrustInput: unknown;
  deviceActive: boolean;
  recentDirectInteraction: boolean;
  explicitRoomMatch: boolean;
}>;

type ResolverInput = Readonly<{
  accountId: string;
  intent: NormalizedDeviceMediaIntent;
  currentPrimaryDeviceId: string | null;
  activeMediaDeviceId: string | null;
  recentlyAddressedDeviceId: string | null;
  candidates: readonly CandidateInput[];
}>;

type EligibleCandidate = Readonly<{
  adapter: DeviceMediaAdapterDescriptor;
  score: number;
}>;

const TOP_LEVEL_KEYS = new Set([
  'accountId',
  'intent',
  'currentPrimaryDeviceId',
  'activeMediaDeviceId',
  'recentlyAddressedDeviceId',
  'candidates',
]);

const CANDIDATE_KEYS = new Set([
  'adapter',
  'deviceTrustInput',
  'deviceActive',
  'recentDirectInteraction',
  'explicitRoomMatch',
]);

function result(
  selectedDeviceId: string | null,
  selectedAdapterId: string | null,
  requiredCapability: string | null,
  reason: DeviceMediaTargetResolutionReason,
): DeviceMediaTargetResolution {
  return Object.freeze({
    selectedDeviceId,
    selectedAdapterId,
    requiredCapability,
    reason,
    grantsAuthority: false,
  });
}

function invalidResult(): DeviceMediaTargetResolution {
  return result(
    null,
    null,
    null,
    'invalid_input',
  );
}

function parseNullableDeviceId(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (isIdentityId('device', value)) {
    return value;
  }

  return undefined;
}

function parseInput(
  input: unknown,
): ResolverInput | null {
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
    Object.keys(record).length !== TOP_LEVEL_KEYS.size
    || Object.keys(record).some(
      (key) => !TOP_LEVEL_KEYS.has(key),
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !Array.isArray(record.candidates)
    || record.candidates.length === 0
    || record.candidates.length > 32
  ) {
    return null;
  }

  const intent =
    parseDeviceMediaIntent(
      record.intent,
    );
  const currentPrimaryDeviceId =
    parseNullableDeviceId(
      record.currentPrimaryDeviceId,
    );
  const activeMediaDeviceId =
    parseNullableDeviceId(
      record.activeMediaDeviceId,
    );
  const recentlyAddressedDeviceId =
    parseNullableDeviceId(
      record.recentlyAddressedDeviceId,
    );

  if (
    !intent
    || currentPrimaryDeviceId === undefined
    || activeMediaDeviceId === undefined
    || recentlyAddressedDeviceId === undefined
  ) {
    return null;
  }

  const candidates: CandidateInput[] = [];
  const candidateDeviceIds = new Set<string>();

  for (const value of record.candidates) {
    if (
      typeof value !== 'object'
      || value === null
      || Array.isArray(value)
    ) {
      return null;
    }

    const candidate =
      value as Record<string, unknown>;

    if (
      Object.keys(candidate).length
        !== CANDIDATE_KEYS.size
      || Object.keys(candidate).some(
        (key) => !CANDIDATE_KEYS.has(key),
      )
      || typeof candidate.deviceActive
        !== 'boolean'
      || typeof candidate.recentDirectInteraction
        !== 'boolean'
      || typeof candidate.explicitRoomMatch
        !== 'boolean'
    ) {
      return null;
    }

    const adapter =
      parseDeviceMediaAdapterDescriptor(
        candidate.adapter,
      );

    if (
      !adapter
      || candidateDeviceIds.has(
        adapter.deviceId,
      )
    ) {
      return null;
    }

    candidateDeviceIds.add(
      adapter.deviceId,
    );

    candidates.push(
      Object.freeze({
        adapter,
        deviceTrustInput:
          candidate.deviceTrustInput,
        deviceActive:
          candidate.deviceActive,
        recentDirectInteraction:
          candidate.recentDirectInteraction,
        explicitRoomMatch:
          candidate.explicitRoomMatch,
      }),
    );
  }

  return Object.freeze({
    accountId: record.accountId,
    intent,
    currentPrimaryDeviceId,
    activeMediaDeviceId,
    recentlyAddressedDeviceId,
    candidates:
      Object.freeze(candidates),
  });
}

function trustBindingMatches(
  trustInput: unknown,
  accountId: string,
  deviceId: string,
): boolean {
  if (
    typeof trustInput !== 'object'
    || trustInput === null
    || Array.isArray(trustInput)
  ) {
    return false;
  }

  const record =
    trustInput as Record<string, unknown>;

  return (
    record.expectedAccountId
      === accountId
    && record.expectedDeviceId
      === deviceId
  );
}

function scoreCandidate(
  input: ResolverInput,
  candidate: CandidateInput & {
    adapter: DeviceMediaAdapterDescriptor;
  },
): number {
  let score =
    candidate.adapter.status === 'ready'
      ? 10
      : 0;

  if (
    input.activeMediaDeviceId
      === candidate.adapter.deviceId
  ) {
    score += 80;
  }

  if (
    input.currentPrimaryDeviceId
      === candidate.adapter.deviceId
  ) {
    score += 60;
  }

  if (
    input.recentlyAddressedDeviceId
      === candidate.adapter.deviceId
  ) {
    score += 40;
  }

  if (candidate.recentDirectInteraction) {
    score += 30;
  }

  if (candidate.explicitRoomMatch) {
    score += 20;
  }

  if (candidate.deviceActive) {
    score += 10;
  }

  return score;
}

export function resolveDeviceMediaTarget(
  rawInput: unknown,
  trustedEvaluationTimeInput: unknown,
): DeviceMediaTargetResolution {
  const input = parseInput(rawInput);
  const trustedEvaluationTimeMs =
    parseTrustedEvaluationTime(
      trustedEvaluationTimeInput,
    );

  if (
    !input
    || trustedEvaluationTimeMs === null
  ) {
    return invalidResult();
  }

  const requiredCapability =
    capabilityForDeviceMediaIntent(
      input.intent.kind,
    );

  const eligible: EligibleCandidate[] = [];

  for (const candidate of input.candidates) {
    const adapter = candidate.adapter;

    if (
      adapter.status === 'unavailable'
      || adapter.declaredAt
        > trustedEvaluationTimeMs
      || adapter.expiresAt
        <= trustedEvaluationTimeMs
      || !adapter.supportedIntents.includes(
        input.intent.kind,
      )
      || !trustBindingMatches(
        candidate.deviceTrustInput,
        input.accountId,
        adapter.deviceId,
      )
      || !evaluateDeviceTrust(
        candidate.deviceTrustInput,
      ).trusted
    ) {
      continue;
    }

    eligible.push(
      Object.freeze({
        adapter,
        score: scoreCandidate(
          input,
          candidate as CandidateInput & {
            adapter:
              DeviceMediaAdapterDescriptor;
          },
        ),
      }),
    );
  }

  if (input.intent.targetDeviceId) {
    const explicit =
      eligible.find(
        (candidate) =>
          candidate.adapter.deviceId
            === input.intent.targetDeviceId,
      );

    if (!explicit) {
      return result(
        null,
        null,
        requiredCapability,
        'explicit_target_ineligible',
      );
    }

    return result(
      explicit.adapter.deviceId,
      explicit.adapter.adapterId,
      requiredCapability,
      'explicit_target_selected',
    );
  }

  if (eligible.length === 0) {
    return result(
      null,
      null,
      requiredCapability,
      'no_eligible_target',
    );
  }

  const ranked =
    [...eligible].sort(
      (left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return left.adapter.deviceId
          .localeCompare(
            right.adapter.deviceId,
          );
      },
    );

  if (
    ranked.length > 1
    && ranked[0].score === ranked[1].score
  ) {
    return result(
      null,
      null,
      requiredCapability,
      'clarification_required',
    );
  }

  return result(
    ranked[0].adapter.deviceId,
    ranked[0].adapter.adapterId,
    requiredCapability,
    'context_target_selected',
  );
}
