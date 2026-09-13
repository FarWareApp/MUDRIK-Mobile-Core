import type {
  ChatMessage,
} from '../types';
import {
  getLocalMessageDateKey,
} from '../formatters/getLocalMessageDateKey';

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
    }>;

export function buildMessageListItems(
  messages: readonly ChatMessage[],
): readonly MessageListItem[] {
  const items: MessageListItem[] = [];
  let previousDateKey: string | null = null;
  let dateGroupIndex = 0;

  for (const message of messages) {
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

    items.push(
      Object.freeze({
        kind: 'message' as const,
        id: `message:${message.id}`,
        message,
      }),
    );

    previousDateKey = dateKey;
  }

  return Object.freeze(items);
}
