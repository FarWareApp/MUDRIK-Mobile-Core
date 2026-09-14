import {
  getLocalMessageDateKey,
} from '../formatters/getLocalMessageDateKey';
import type { ChatMessage } from '../types';

export const MESSAGE_VISUAL_GROUP_WINDOW_MS =
  5 * 60 * 1000;

function hasValidMessageTime(value: number) {
  return Number.isInteger(value) && value >= 0;
}

export function areMessagesInSameVisualGroup(
  first: ChatMessage,
  second: ChatMessage,
) {
  if (first.role !== second.role) {
    return false;
  }

  if (
    !hasValidMessageTime(first.createdAt)
    || !hasValidMessageTime(second.createdAt)
    || second.createdAt < first.createdAt
    || second.createdAt - first.createdAt
      > MESSAGE_VISUAL_GROUP_WINDOW_MS
  ) {
    return false;
  }

  const firstDateKey = getLocalMessageDateKey(
    first.createdAt,
  );
  const secondDateKey = getLocalMessageDateKey(
    second.createdAt,
  );

  return firstDateKey !== null
    && firstDateKey === secondDateKey;
}
