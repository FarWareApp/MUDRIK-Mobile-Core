import type {
  CompanionInteractionStyle,
  CompanionPersonalityPreset,
  CompanionPresentation,
  CompanionVoicePreference,
} from '../../contracts/Companion';

import {
  validateCompanionProfile,
} from './companionProfilePolicy';

export type CompanionSurface =
  | 'text'
  | 'voice'
  | 'avatar';

export type CompanionSurfaceIdentity = Readonly<{
  companionId: 'companion_primary';
  displayName: string;
  presentation: CompanionPresentation;
  voicePreference: CompanionVoicePreference;
  voiceProfileId: string | null;
  avatarProfileId: string | null;
  interactionStyle: CompanionInteractionStyle;
  personalityPreset: CompanionPersonalityPreset;
  warmth: number;
  directness: number;
  humor: number;
  verbosity: number;
  speakingRate: number;
  preferredLanguages: readonly string[];

  grantsExecutionAuthority: false;
  grantsSensorAuthority: false;
  grantsMemoryAuthority: false;
}>;

export type CompanionSurfaceProjection = Readonly<{
  available: boolean;
  reason:
    | 'available'
    | 'companion_disabled'
    | 'invalid_profile';
  surface: CompanionSurface;
  identity: CompanionSurfaceIdentity | null;
}>;

const SURFACES: readonly CompanionSurface[] = [
  'text',
  'voice',
  'avatar',
];

export function projectCompanionToSurface(
  profileInput: unknown,
  surfaceInput: unknown,
): CompanionSurfaceProjection {
  const surface =
    typeof surfaceInput === 'string'
    && SURFACES.includes(
      surfaceInput as CompanionSurface,
    )
      ? surfaceInput as CompanionSurface
      : null;

  if (!surface) {
    return Object.freeze({
      available: false,
      reason: 'invalid_profile',
      surface: 'text',
      identity: null,
    });
  }

  const validated =
    validateCompanionProfile(
      profileInput,
    );

  if (
    !validated.accepted
    || !validated.profile
  ) {
    return Object.freeze({
      available: false,
      reason: 'invalid_profile',
      surface,
      identity: null,
    });
  }

  const profile = validated.profile;

  if (!profile.enabled) {
    return Object.freeze({
      available: false,
      reason: 'companion_disabled',
      surface,
      identity: null,
    });
  }

  return Object.freeze({
    available: true,
    reason: 'available',
    surface,
    identity: Object.freeze({
      companionId:
        'companion_primary',
      displayName:
        profile.displayName,
      presentation:
        profile.presentation,
      voicePreference:
        profile.voicePreference,
      voiceProfileId:
        profile.voiceProfileId,
      avatarProfileId:
        profile.avatarProfileId,
      interactionStyle:
        profile.interactionStyle,
      personalityPreset:
        profile.personalityPreset,
      warmth: profile.warmth,
      directness:
        profile.directness,
      humor: profile.humor,
      verbosity: profile.verbosity,
      speakingRate:
        profile.speakingRate,
      preferredLanguages:
        Object.freeze([
          ...profile
            .preferredLanguages,
        ]),
      grantsExecutionAuthority:
        false,
      grantsSensorAuthority:
        false,
      grantsMemoryAuthority:
        false,
    }),
  });
}
