export function getLocalMessageDateKey(
  timestamp: number,
): string | null {
  if (
    !Number.isSafeInteger(timestamp)
    || timestamp < 0
  ) {
    return null;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
