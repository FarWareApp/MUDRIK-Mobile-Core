import type {
  CompanionTranslationKey,
} from '../../core/localization/companionTranslations';
import type {
  CompanionProfileErrorCode,
} from './CompanionProfileErrorCode';

const KEYS: Record<
  CompanionProfileErrorCode,
  CompanionTranslationKey
> = {
  'load-failed': 'companionLoadFailed',
  'name-required': 'companionNameRequired',
  'save-failed': 'companionSaveFailed',
  'reset-failed': 'companionResetFailed',
};

export function getCompanionProfileErrorTranslationKey(
  error: CompanionProfileErrorCode,
): CompanionTranslationKey {
  return KEYS[error];
}
