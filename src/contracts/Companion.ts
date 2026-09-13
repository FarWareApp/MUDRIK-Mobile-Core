export type CompanionPresentation =
  | 'male'
  | 'female';

export type CompanionVoicePreference =
  | 'auto'
  | 'male'
  | 'female';

export type CompanionInteractionStyle =
  | 'balanced'
  | 'warm'
  | 'calm'
  | 'direct';

export type CompanionPersonalityPreset =
  | 'balanced'
  | 'professional'
  | 'calm'
  | 'friendly'
  | 'minimal'
  | 'coach'
  | 'study_partner'
  | 'creative_partner';

export type CompanionPresenceLevel =
  | 'silent'
  | 'normal'
  | 'helpful'
  | 'active';

export type CompanionProfile = {
  companionId: string;
  enabled: boolean;

  displayName: string;

  presentation:
    CompanionPresentation;

  voicePreference:
    CompanionVoicePreference;

  voiceProfileId:
    string | null;

  avatarProfileId:
    string | null;

  interactionStyle:
    CompanionInteractionStyle;

  personalityPreset:
    CompanionPersonalityPreset;

  warmth: number;
  directness: number;
  humor: number;
  initiative: number;
  verbosity: number;

  speakingRate: number;

  preferredLanguages:
    string[];

  memoryPolicyId:
    string | null;

  presenceLevel:
    CompanionPresenceLevel;

  showCaptions: boolean;

  revision: number;
  createdAt: number;
  updatedAt: number;
};

export const createDefaultCompanionProfile =
  (): CompanionProfile => {
    const now = Date.now();

    return {
      companionId:
        'companion_primary',

      enabled: true,

      displayName: 'MUDRIK',

      presentation: 'male',

      voicePreference: 'auto',

      voiceProfileId: null,
      avatarProfileId: null,

      interactionStyle:
        'balanced',

      personalityPreset:
        'balanced',

      warmth: 55,
      directness: 55,
      humor: 20,
      initiative: 20,
      verbosity: 50,

      speakingRate: 1,

      preferredLanguages: [],

      memoryPolicyId: null,

      presenceLevel: 'normal',

      showCaptions: true,

      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  };

export type CompanionSessionPhase =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'paused'
  | 'interrupted'
  | 'error';
