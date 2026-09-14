import type { ChatTranslationKey } from '../../core/localization/chatTranslations';
import type { ChatSendErrorCode } from './ChatSendErrorCode';

export function getChatSendErrorTranslationKey(
  error: ChatSendErrorCode,
): ChatTranslationKey {
  switch (error) {
    case 'transport-failed':
      return 'messageSendFailed';
    case 'local-persist-failed':
      return 'messageSaveFailed';
  }
}
