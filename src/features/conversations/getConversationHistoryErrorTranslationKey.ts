import type {
  ConversationTranslationKey,
} from '../../core/localization/conversationTranslations';
import type {
  ConversationHistoryErrorCode,
} from './ConversationHistoryErrorCode';

export function getConversationHistoryErrorTranslationKey(
  code: ConversationHistoryErrorCode,
): ConversationTranslationKey {
  switch (code) {
    case 'create-failed':
      return 'conversationCreateFailed';
    case 'pin-failed':
      return 'conversationPinUpdateFailed';
    case 'archive-failed':
      return 'conversationArchiveUpdateFailed';
    case 'delete-failed':
      return 'conversationDeleteFailed';
  }
}
