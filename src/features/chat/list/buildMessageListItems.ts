import type {
  ChatMessage,
} from '../types';
import {
  getLocalMessageDateKey,
} from '../formatters/getLocalMessageDateKey';
import {
  areMessagesInSameVisualGroup,
} from './areMessagesInSameVisualGroup';

export type MessageGroupPosition =
  | 'single'
  | 'first'
  | 'middle'
  | 'last';

export type MessageListItem =
  | Readonly<{
      kind: 'date';
      id: string;
      createdAt: number;
    }>
  | Readonly<{
      kind: 'message';
      id: string;
      message: ChatMessage;
      groupPosition: MessageGroupPosition;
    }>;

function resolveGroupPosition(
  groupedWithPrevious: boolean,
  groupedWithNext: boolean,
): MessageGroupPosition {
  if (groupedWithPrevious && groupedWithNext) {
    return 'middle';
  }

  if (groupedWithPrevious) {
    return 'last';
  }

  if (groupedWithNext) {
    return 'first';
  }

  return 'single';
}

export function buildMessageListItems(
  messages: readonly ChatMessage[],
): readonly MessageListItem[] {
  const items: MessageListItem[] = [];
  let previousDateKey: string | null = null;
  let dateGroupIndex = 0;

  for (
    let index = 0;
    index < messages.length;
    index += 1
  ) {
    const message = messages[index];
    const dateKey = getLocalMessageDateKey(
      message.createdAt,
    );

    if (
      dateKey !== null
      && dateKey !== previousDateKey
    ) {
      dateGroupIndex += 1;
      items.push(
        Object.freeze({
          kind: 'date' as const,
          id: `date:${dateKey}:${dateGroupIndex}`,
          createdAt: message.createdAt,
        }),
      );
    }

    const previousMessage = index > 0
      ? messages[index - 1]
      : undefined;
    const nextMessage = index + 1 < messages.length
      ? messages[index + 1]
      : undefined;

    const groupedWithPrevious = previousMessage
      ? areMessagesInSameVisualGroup(
          previousMessage,
          message,
        )
      : false;
    const groupedWithNext = nextMessage
      ? areMessagesInSameVisualGroup(
          message,
          nextMessage,
        )
      : false;

    items.push(
      Object.freeze({
        kind: 'message' as const,
        id: `message:${message.id}`,
        message,
        groupPosition: resolveGroupPosition(
          groupedWithPrevious,
          groupedWithNext,
        ),
      }),
    );

    previousDateKey = dateKey;
  }

  return Object.freeze(items);
}
