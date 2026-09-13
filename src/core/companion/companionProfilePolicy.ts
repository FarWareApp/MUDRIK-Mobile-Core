import type {
  CompanionInteractionStyle,
  CompanionPersonalityPreset,
  CompanionPresenceLevel,
  CompanionPresentation,
  CompanionProfile,
  CompanionVoicePreference,
} from '../../contracts/Companion';

export type CompanionProfileValidationReason =
  | 'accepted'
  | 'invalid_profile'
  | 'invalid_identity'
  | 'invalid_name'
  | 'invalid_presentation'
  | 'invalid_voice_preference'
  | 'invalid_profile_reference'
  | 'invalid_interaction_style'
  | 'invalid_personality_preset'
  | 'invalid_personality_dimension'
  | 'invalid_speaking_rate'
  | 'invalid_languages'
  | 'invalid_presence_level'
  | 'invalid_revision'
  | 'invalid_timestamp';

export type CompanionProfileValidation = Readonly<{
  accepted: boolean;
  reason: CompanionProfileValidationReason;
  profile: Readonly<CompanionProfile> | null;
}>;

const PRESENTATIONS: readonly CompanionPresentation[] = [
  'male',
  'female',
];

const VOICE_PREFERENCES: readonly CompanionVoicePreference[] = [
  'auto',
  'male',
  'female',
];

const INTERACTION_STYLES: readonly CompanionInteractionStyle[] = [
  'balanced',
  'warm',
  'calm',
  'direct',
];

const PERSONALITY_PRESETS: readonly CompanionPersonalityPreset[] = [
  'balanced',
  'professional',
  'calm',
  'friendly',
  'minimal',
  'coach',
  'study_partner',
  'creative_partner',
];

const PRESENCE_LEVELS: readonly CompanionPresenceLevel[] = [
  'silent',
  'normal',
  'helpful',
  'active',
];

const PROFILE_KEYS = Object.freeze([
  'companionId',
  'enabled',
  'displayName',
  'presentation',
  'voicePreference',
  'voiceProfileId',
  'avatarProfileId',
  'interactionStyle',
  'personalityPreset',
  'warmth',
  'directness',
  'humor',
  'initiative',
  'verbosity',
  'speakingRate',
  'preferredLanguages',
  'memoryPolicyId',
  'presenceLevel',
  'showCaptions',
  'revision',
  'createdAt',
  'updatedAt',
] as const);

const PROFILE_REF =
  /^(?:voice|avatar|memory)_[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

const CREDENTIAL_SHAPE =
  /(?:^|[_-])(?:sk|api[_-]?key|bearer|token|secret|ghp|github[_-]?pat|aiza)(?:[_-]|$)/i;

const LANGUAGE_TAG =
  /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === PROFILE_KEYS.length
    && keys.every(
      (key) =>
        (PROFILE_KEYS as readonly string[])
          .includes(key),
    )
  );
}

function isBoundedInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 100
  );
}

function isTimestamp(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function isProfileReference(
  value: unknown,
  prefix: 'voice' | 'avatar' | 'memory',
): value is string | null {
  return (
    value === null
    || (
      typeof value === 'string'
      && value.startsWith(`${prefix}_`)
      && PROFILE_REF.test(value)
      && !CREDENTIAL_SHAPE.test(value)
    )
  );
}

function normalizeLanguages(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value)
    || value.length > 8
  ) {
    return null;
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item !== 'string'
      || item.length > 35
      || !LANGUAGE_TAG.test(item)
    ) {
      return null;
    }

    const normalized =
      item.toLowerCase();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return Object.freeze(result);
}

function reject(
  reason: CompanionProfileValidationReason,
): CompanionProfileValidation {
  return Object.freeze({
    accepted: false,
    reason,
    profile: null,
  });
}

export function validateCompanionProfile(
  input: unknown,
): CompanionProfileValidation {
  if (
    !isRecord(input)
    || !hasExactKeys(input)
  ) {
    return reject('invalid_profile');
  }

  if (
    input.companionId !== 'companion_primary'
    || typeof input.enabled !== 'boolean'
  ) {
    return reject('invalid_identity');
  }

  if (
    typeof input.displayName !== 'string'
    || input.displayName !== input.displayName.trim()
    || input.displayName.length < 1
    || input.displayName.length > 60
  ) {
    return reject('invalid_name');
  }

  if (
    typeof input.presentation !== 'string'
    || !PRESENTATIONS.includes(
      input.presentation as CompanionPresentation,
    )
  ) {
    return reject('invalid_presentation');
  }

  if (
    typeof input.voicePreference !== 'string'
    || !VOICE_PREFERENCES.includes(
      input.voicePreference as CompanionVoicePreference,
    )
  ) {
    return reject('invalid_voice_preference');
  }

  if (
    !isProfileReference(
      input.voiceProfileId,
      'voice',
    )
    || !isProfileReference(
      input.avatarProfileId,
      'avatar',
    )
    || !isProfileReference(
      input.memoryPolicyId,
      'memory',
    )
  ) {
    return reject('invalid_profile_reference');
  }

  if (
    typeof input.interactionStyle !== 'string'
    || !INTERACTION_STYLES.includes(
      input.interactionStyle as CompanionInteractionStyle,
    )
  ) {
    return reject('invalid_interaction_style');
  }

  if (
    typeof input.personalityPreset !== 'string'
    || !PERSONALITY_PRESETS.includes(
      input.personalityPreset as CompanionPersonalityPreset,
    )
  ) {
    return reject('invalid_personality_preset');
  }

  if (
    !isBoundedInteger(input.warmth)
    || !isBoundedInteger(input.directness)
    || !isBoundedInteger(input.humor)
    || !isBoundedInteger(input.initiative)
    || !isBoundedInteger(input.verbosity)
  ) {
    return reject('invalid_personality_dimension');
  }

  if (
    typeof input.speakingRate !== 'number'
    || !Number.isFinite(input.speakingRate)
    || input.speakingRate < 0.5
    || input.speakingRate > 2
  ) {
    return reject('invalid_speaking_rate');
  }

  const preferredLanguages =
    normalizeLanguages(
      input.preferredLanguages,
    );

  if (!preferredLanguages) {
    return reject('invalid_languages');
  }

  if (
    typeof input.presenceLevel !== 'string'
    || !PRESENCE_LEVELS.includes(
      input.presenceLevel as CompanionPresenceLevel,
    )
    || typeof input.showCaptions !== 'boolean'
  ) {
    return reject('invalid_presence_level');
  }

  if (
    typeof input.revision !== 'number'
    || !Number.isSafeInteger(input.revision)
    || input.revision < 1
  ) {
    return reject('invalid_revision');
  }

  if (
    !isTimestamp(input.createdAt)
    || !isTimestamp(input.updatedAt)
    || input.updatedAt < input.createdAt
  ) {
    return reject('invalid_timestamp');
  }

  const profile: CompanionProfile = {
    companionId: input.companionId,
    enabled: input.enabled,
    displayName: input.displayName,
    presentation:
      input.presentation as CompanionPresentation,
    voicePreference:
      input.voicePreference as CompanionVoicePreference,
    voiceProfileId: input.voiceProfileId,
    avatarProfileId: input.avatarProfileId,
    interactionStyle:
      input.interactionStyle as CompanionInteractionStyle,
    personalityPreset:
      input.personalityPreset as CompanionPersonalityPreset,
    warmth: input.warmth,
    directness: input.directness,
    humor: input.humor,
    initiative: input.initiative,
    verbosity: input.verbosity,
    speakingRate: input.speakingRate,
    preferredLanguages,
    memoryPolicyId: input.memoryPolicyId,
    presenceLevel:
      input.presenceLevel as CompanionPresenceLevel,
    showCaptions: input.showCaptions,
    revision: input.revision,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  return Object.freeze({
    accepted: true,
    reason: 'accepted',
    profile: Object.freeze(profile),
  });
}
