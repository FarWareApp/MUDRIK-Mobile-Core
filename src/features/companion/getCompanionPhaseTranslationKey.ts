import type {
  CompanionSessionPhase,
} from '../../contracts/Companion';
import type {
  CompanionTranslationKey,
} from '../../core/localization/companionTranslations';

const KEYS: Record<
  CompanionSessionPhase,
  CompanionTranslationKey
> = {
  idle: 'companionPhaseIdle',
  listening: 'companionPhaseListening',
  processing: 'companionPhaseProcessing',
  speaking: 'companionPhaseSpeaking',
  paused: 'companionPhasePaused',
  interrupted: 'companionPhaseInterrupted',
  error: 'companionPhaseError',
};

export function getCompanionPhaseTranslationKey(
  phase: CompanionSessionPhase,
): CompanionTranslationKey {
  return KEYS[phase];
}
