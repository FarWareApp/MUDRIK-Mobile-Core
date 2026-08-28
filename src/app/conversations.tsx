import React from 'react';

import { appServices } from '../core/composition/AppServices';
import { ConversationsScreen } from '../features/conversations/ConversationsScreen';

export default function ConversationsRoute() {
  return (
    <ConversationsScreen
      repository={
        appServices.conversationRepository
      }
      onConversationDeleted={async () => {
        await appServices
          .attachmentCleanupService
          .cleanupOrphans();
      }}
    />
  );
}
