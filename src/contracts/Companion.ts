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

export type CompanionProfile = {
  displayName: string;

  presentation:
    CompanionPresentation;

  voicePreference:
    CompanionVoicePreference;

  interactionStyle:
    CompanionInteractionStyle;

  showCaptions: boolean;

  createdAt: number;
  updatedAt: number;
};

export const createDefaultCompanionProfile =
  (): CompanionProfile => {
    const now = Date.now();

    return {
      displayName: 'MUDRIK',

      presentation: 'male',

      voicePreference: 'auto',

      interactionStyle:
        'balanced',

      showCaptions: true,

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
