import {
  evaluateDeviceTrust,
} from '../identity/deviceTrust';

import {
  isIdentityId,
} from '../identity/identityIds';

import type {
  ObservationPrivacyPolicyState,
} from '../privacy/observationPrivacyState';

import {
  parsePresenceObservation,
} from './presenceRegistry';

import type {
  PresenceObservation,
} from './presenceRegistry';

import {
  isSurfaceId,
} from './surfaceContract';

import type {
  SurfaceDescriptor,
  SurfacePresentationCapability,
} from './surfaceContract';

import type {
  TrustedSurfaceRegistry,
} from './trustedSurfaceRegistry';

export type ContentSensitivity =
  | 'public'
  | 'private'
  | 'sensitive';

export type PresenceResolutionReason =
  | 'selected'
  | 'kept_current'
  | 'manual_target_selected'
  | 'invalid_input'
  | 'automatic_handoff_disabled'
  | 'pinned_surface_ineligible'
  | 'no_eligible_surface';

export type PresenceResolution = Readonly<{
  selectedSurfaceId: string | null;
  previousSurfaceId: string | null;
  handoffRequired: boolean;
  reason: PresenceResolutionReason;
  preservedPrivacyState: ObservationPrivacyPolicyState;
  grantsExecutionAuthority: false;
  grantsSensorAuthority: false;
  grantsMemoryAuthority: false;
  grantsAdditionalDisclosureAuthority: false;
}>;

type CandidateInput = Readonly<{
  surfaceId: string;
  presence: unknown;
  deviceTrustInput: unknown;
}>;

type ResolutionInput = Readonly<{
  presenceSessionId: string;
  accountId: string;
  now: number;
  followMeEnabled: boolean;
  manualHandoff: boolean;
  currentPrimarySurfaceId: string | null;
  pinnedSurfaceId: string | null;
  contentSensitivity: ContentSensitivity;
  userConfirmedDisclosure: boolean;
  requiredCapabilities: readonly SurfacePresentationCapability[];
  privacyState: ObservationPrivacyPolicyState;
  candidates: readonly CandidateInput[];
}>;

type EligibleCandidate = Readonly<{
  surface: SurfaceDescriptor;
  presence: PresenceObservation;
  score: number;
}>;

const PRESENCE_SESSION_PATTERN =
  /^psess_[a-z0-9][a-z0-9_-]{15,63}$/;

const TOP_LEVEL_KEYS = new Set([
  'presenceSessionId',
  'accountId',
  'now',
  'followMeEnabled',
  'manualHandoff',
  'currentPrimarySurfaceId',
  'pinnedSurfaceId',
  'contentSensitivity',
  'userConfirmedDisclosure',
  'requiredCapabilities',
  'privacyState',
  'candidates',
]);

const CANDIDATE_KEYS = new Set([
  'surfaceId',
  'presence',
  'deviceTrustInput',
]);

const CAPABILITIES: readonly SurfacePresentationCapability[] = [
  'text',
  'audio_output',
  'microphone',
  'avatar',
  'private_audio',
];

const PRIVACY_STATES: readonly ObservationPrivacyPolicyState[] = [
  'active',
  'visual_off',
  'ambient_off',
  'privacy_lock',
];

const SENSITIVITIES: readonly ContentSensitivity[] = [
  'public',
  'private',
  'sensitive',
];

function baseDecision(
  input: ResolutionInput,
  selectedSurfaceId: string | null,
  reason: PresenceResolutionReason,
): PresenceResolution {
  return Object.freeze({
    selectedSurfaceId,
    previousSurfaceId:
      input.currentPrimarySurfaceId,
    handoffRequired:
      selectedSurfaceId !== null
      && selectedSurfaceId
        !== input.currentPrimarySurfaceId,
    reason,
    preservedPrivacyState:
      input.privacyState,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsMemoryAuthority: false,
    grantsAdditionalDisclosureAuthority: false,
  });
}

function invalidDecision(): PresenceResolution {
  return Object.freeze({
    selectedSurfaceId: null,
    previousSurfaceId: null,
    handoffRequired: false,
    reason: 'invalid_input',
    preservedPrivacyState: 'privacy_lock',
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsMemoryAuthority: false,
    grantsAdditionalDisclosureAuthority: false,
  });
}

function parseRequiredCapabilities(
  value: unknown,
): readonly SurfacePresentationCapability[] | null {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.length > CAPABILITIES.length
  ) {
    return null;
  }

  const seen =
    new Set<SurfacePresentationCapability>();
  const result: SurfacePresentationCapability[] = [];

  for (const item of value) {
    if (
      typeof item !== 'string'
      || !CAPABILITIES.includes(
        item as SurfacePresentationCapability,
      )
      || seen.has(
        item as SurfacePresentationCapability,
      )
    ) {
      return null;
    }

    const capability =
      item as SurfacePresentationCapability;

    seen.add(capability);
    result.push(capability);
  }

  return Object.freeze(result);
}

function parseNullableSurfaceId(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (isSurfaceId(value)) {
    return value;
  }

  return undefined;
}

function parseInput(
  input: unknown,
): ResolutionInput | null {
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
  ) {
    return null;
  }

  const currentPrimarySurfaceId =
    parseNullableSurfaceId(
      record.currentPrimarySurfaceId,
    );
  const pinnedSurfaceId =
    parseNullableSurfaceId(
      record.pinnedSurfaceId,
    );
  const requiredCapabilities =
    parseRequiredCapabilities(
      record.requiredCapabilities,
    );

  if (
    typeof record.presenceSessionId !== 'string'
    || !PRESENCE_SESSION_PATTERN.test(
      record.presenceSessionId,
    )
    || !isIdentityId(
      'account',
      record.accountId,
    )
    || !isSafeTimestamp(record.now)
    || typeof record.followMeEnabled !== 'boolean'
    || typeof record.manualHandoff !== 'boolean'
    || currentPrimarySurfaceId === undefined
    || pinnedSurfaceId === undefined
    || typeof record.contentSensitivity !== 'string'
    || !SENSITIVITIES.includes(
      record.contentSensitivity as ContentSensitivity,
    )
    || typeof record.userConfirmedDisclosure !== 'boolean'
    || !requiredCapabilities
    || typeof record.privacyState !== 'string'
    || !PRIVACY_STATES.includes(
      record.privacyState as ObservationPrivacyPolicyState,
    )
    || !Array.isArray(record.candidates)
    || record.candidates.length > 32
  ) {
    return null;
  }

  const candidates: CandidateInput[] = [];
  const seenSurfaceIds = new Set<string>();

  for (const candidate of record.candidates) {
    if (
      typeof candidate !== 'object'
      || candidate === null
      || Array.isArray(candidate)
    ) {
      return null;
    }

    const candidateRecord =
      candidate as Record<string, unknown>;

    if (
      Object.keys(candidateRecord).length
        !== CANDIDATE_KEYS.size
      || Object.keys(candidateRecord).some(
        (key) => !CANDIDATE_KEYS.has(key),
      )
      || !isSurfaceId(candidateRecord.surfaceId)
      || seenSurfaceIds.has(candidateRecord.surfaceId)
    ) {
      return null;
    }

    seenSurfaceIds.add(candidateRecord.surfaceId);

    candidates.push({
      surfaceId: candidateRecord.surfaceId,
      presence: candidateRecord.presence,
      deviceTrustInput:
        candidateRecord.deviceTrustInput,
    });
  }

  return Object.freeze({
    presenceSessionId:
      record.presenceSessionId,
    accountId: record.accountId,
    now: record.now,
    followMeEnabled:
      record.followMeEnabled,
    manualHandoff:
      record.manualHandoff,
    currentPrimarySurfaceId,
    pinnedSurfaceId,
    contentSensitivity:
      record.contentSensitivity as ContentSensitivity,
    userConfirmedDisclosure:
      record.userConfirmedDisclosure,
    requiredCapabilities,
    privacyState:
      record.privacyState as ObservationPrivacyPolicyState,
    candidates: Object.freeze(candidates),
  });
}

function trustBindingMatches(
  deviceTrustInput: unknown,
  accountId: string,
  deviceId: string,
): boolean {
  if (
    typeof deviceTrustInput !== 'object'
    || deviceTrustInput === null
    || Array.isArray(deviceTrustInput)
  ) {
    return false;
  }

  const trust =
    deviceTrustInput as Record<string, unknown>;

  return (
    trust.expectedAccountId === accountId
    && trust.expectedDeviceId === deviceId
  );
}

function hasRequiredCapabilities(
  surface: SurfaceDescriptor,
  required: readonly SurfacePresentationCapability[],
): boolean {
  return required.every(
    (capability) =>
      surface.capabilities.includes(capability),
  );
}

function disclosureAllowed(
  input: ResolutionInput,
  surface: SurfaceDescriptor,
): boolean {
  if (input.contentSensitivity === 'sensitive') {
    return surface.privacyClass === 'personal_private';
  }

  if (input.contentSensitivity === 'private') {
    if (surface.privacyClass === 'personal_private') {
      return true;
    }

    return (
      surface.privacyClass === 'personal_shared_space'
      && input.userConfirmedDisclosure
    );
  }

  if (
    surface.privacyClass === 'public_or_untrusted'
  ) {
    return (
      input.manualHandoff
      && input.userConfirmedDisclosure
    );
  }

  return true;
}

function audioPrivacyAllowed(
  input: ResolutionInput,
  surface: SurfaceDescriptor,
): boolean {
  const audioRequested =
    input.requiredCapabilities.includes(
      'audio_output',
    );

  if (!audioRequested) {
    return true;
  }

  if (input.contentSensitivity === 'sensitive') {
    return surface.capabilities.includes(
      'private_audio',
    );
  }

  if (
    input.contentSensitivity === 'private'
    && surface.sharedSpace
  ) {
    return (
      input.userConfirmedDisclosure
      && surface.capabilities.includes(
        'private_audio',
      )
    );
  }

  return true;
}

function scoreCandidate(
  surface: SurfaceDescriptor,
  presence: PresenceObservation,
): number {
  const privacyBonus =
    surface.privacyClass === 'personal_private'
      ? 60
      : surface.privacyClass === 'personal_shared_space'
        ? 30
        : surface.privacyClass === 'household_shared'
          ? 10
          : 0;

  const interactionBonus =
    presence.recentDirectInteraction
      ? 80
      : 0;
  const activeBonus =
    presence.deviceActive
      ? 40
      : 0;
  const roomBonus =
    presence.explicitRoomMatch
      ? 25
      : 0;
  const degradedPenalty =
    presence.availability === 'degraded'
      ? 100
      : 0;
  const latencyPenalty =
    Math.min(
      100,
      Math.floor(
        presence.estimatedLatencyMs / 100,
      ),
    );

  return (
    presence.confidence * 10
    + privacyBonus
    + interactionBonus
    + activeBonus
    + roomBonus
    - degradedPenalty
    - latencyPenalty
  );
}

function buildEligibleCandidates(
  input: ResolutionInput,
  surfaceRegistry: TrustedSurfaceRegistry,
): readonly EligibleCandidate[] {
  const eligible: EligibleCandidate[] = [];

  for (const candidate of input.candidates) {
    const surface =
      surfaceRegistry.getActiveSurface(
        candidate.surfaceId,
        input.accountId,
      );
    const presence =
      parsePresenceObservation(
        candidate.presence,
      );

    if (
      !surface
      || !presence
      || presence.surfaceId !== surface.surfaceId
    ) {
      continue;
    }

    if (
      !trustBindingMatches(
        candidate.deviceTrustInput,
        input.accountId,
        surface.deviceId,
      )
    ) {
      continue;
    }

    const trustDecision =
      evaluateDeviceTrust(
        candidate.deviceTrustInput,
      );

    if (!trustDecision.trusted) {
      continue;
    }

    if (
      presence.availability === 'offline'
      || presence.expiresAt < input.now
      || presence.observedAt > input.now
      || !hasRequiredCapabilities(
        surface,
        input.requiredCapabilities,
      )
      || !disclosureAllowed(input, surface)
      || !audioPrivacyAllowed(input, surface)
    ) {
      continue;
    }

    if (
      !input.manualHandoff
      && surface.privacyClass === 'public_or_untrusted'
    ) {
      continue;
    }

    const minimumConfidence =
      input.manualHandoff
        ? 0
        : input.contentSensitivity === 'public'
          ? 60
          : 80;

    if (presence.confidence < minimumConfidence) {
      continue;
    }

    eligible.push(
      Object.freeze({
        surface,
        presence,
        score: scoreCandidate(
          surface,
          presence,
        ),
      }),
    );
  }

  return Object.freeze(eligible);
}

export function resolvePresenceSurface(
  rawInput: unknown,
  surfaceRegistry: TrustedSurfaceRegistry,
): PresenceResolution {
  const input = parseInput(rawInput);

  if (
    !input
    || !surfaceRegistry
    || typeof surfaceRegistry.getActiveSurface !== 'function'
  ) {
    return invalidDecision();
  }

  const eligible =
    buildEligibleCandidates(
      input,
      surfaceRegistry,
    );

  const bySurfaceId =
    new Map(
      eligible.map(
        (candidate) => [
          candidate.surface.surfaceId,
          candidate,
        ],
      ),
    );

  if (input.pinnedSurfaceId) {
    const pinned =
      bySurfaceId.get(
        input.pinnedSurfaceId,
      );

    if (!pinned) {
      return baseDecision(
        input,
        null,
        'pinned_surface_ineligible',
      );
    }

    return baseDecision(
      input,
      pinned.surface.surfaceId,
      input.manualHandoff
        ? 'manual_target_selected'
        : 'selected',
    );
  }

  if (input.manualHandoff) {
    return baseDecision(
      input,
      null,
      'no_eligible_surface',
    );
  }

  if (!input.followMeEnabled) {
    if (
      input.currentPrimarySurfaceId
      && bySurfaceId.has(
        input.currentPrimarySurfaceId,
      )
    ) {
      return baseDecision(
        input,
        input.currentPrimarySurfaceId,
        'kept_current',
      );
    }

    return baseDecision(
      input,
      null,
      'automatic_handoff_disabled',
    );
  }

  if (eligible.length === 0) {
    return baseDecision(
      input,
      null,
      'no_eligible_surface',
    );
  }

  const ranked = [...eligible]
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.surface.surfaceId
        .localeCompare(
          right.surface.surfaceId,
        );
    });

  const selected = ranked[0];

  if (
    input.currentPrimarySurfaceId
    && selected.surface.surfaceId
      === input.currentPrimarySurfaceId
  ) {
    return baseDecision(
      input,
      selected.surface.surfaceId,
      'kept_current',
    );
  }

  return baseDecision(
    input,
    selected.surface.surfaceId,
    'selected',
  );
}
