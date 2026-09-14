import React, { memo } from 'react';

import type {
  MessageGroupPosition,
} from '../list/buildMessageListItems';
import type { ChatMessage } from '../types';
import { MessageAttachmentList } from './MessageAttachmentList';
import { MessageBubbleSurface } from './MessageBubbleSurface';
import { MessageText } from './MessageText';
import { MessageTimestamp } from './MessageTimestamp';

type Props = {
  message: ChatMessage;
  groupPosition: MessageGroupPosition;
};

export const MessageBubble = memo(
  function MessageBubble({
    message,
    groupPosition,
  }: Props) {
    const isUser = message.role === 'user';
    const shouldShowTimestamp =
      groupPosition === 'single'
      || groupPosition === 'last';

    return (
      <MessageBubbleSurface
        isUser={isUser}
        groupPosition={groupPosition}
      >
        <MessageAttachmentList
          attachments={message.attachments ?? []}
        />

        {message.text.length > 0 && (
          <MessageText
            text={message.text}
            isUser={isUser}
          />
        )}

        {shouldShowTimestamp && (
          <MessageTimestamp
            createdAt={message.createdAt}
            isUser={isUser}
          />
        )}
      </MessageBubbleSurface>
    );
  },
);
