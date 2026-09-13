import React from 'react';

import type { ChatMessage } from '../types';
import { MessageAttachmentList } from './MessageAttachmentList';
import { MessageBubbleSurface } from './MessageBubbleSurface';
import { MessageText } from './MessageText';
import { MessageTimestamp } from './MessageTimestamp';

type Props = {
  message: ChatMessage;
};

export function MessageBubble({
  message,
}: Props) {
  const isUser = message.role === 'user';

  return (
    <MessageBubbleSurface isUser={isUser}>
      <MessageAttachmentList
        attachments={message.attachments ?? []}
      />

      {message.text.length > 0 && (
        <MessageText
          text={message.text}
          isUser={isUser}
        />
      )}

      <MessageTimestamp
        createdAt={message.createdAt}
        isUser={isUser}
      />
    </MessageBubbleSurface>
  );
}
