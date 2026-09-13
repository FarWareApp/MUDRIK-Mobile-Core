import {
  getLocalMessageDateKey,
} from './getLocalMessageDateKey';

export type MessageDateBucket =
  | 'today'
  | 'yesterday'
  | 'dated'
  | 'invalid';

export function getMessageDateBucket(
  timestamp: number,
  now: number,
): MessageDateBucket {
  const messageKey =
    getLocalMessageDateKey(timestamp);
  const todayKey =
    getLocalMessageDateKey(now);

  if (!messageKey || !todayKey) {
    return 'invalid';
  }

  if (messageKey === todayKey) {
    return 'today';
  }

  const nowDate = new Date(now);
  const yesterday = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  );

  yesterday.setDate(
    yesterday.getDate() - 1,
  );

  const yesterdayKey =
    getLocalMessageDateKey(
      yesterday.getTime(),
    );

  if (messageKey === yesterdayKey) {
    return 'yesterday';
  }

  return 'dated';
}
