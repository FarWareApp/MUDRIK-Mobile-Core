export function formatVoiceDurationMs(milliseconds: number): string {
  const safe =
    Number.isFinite(milliseconds) && milliseconds > 0
      ? milliseconds
      : 0;

  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatVoiceDurationSeconds(seconds: number): string {
  const safe =
    Number.isFinite(seconds) && seconds > 0
      ? seconds
      : 0;

  const totalSeconds = Math.floor(safe);
  const minutes = Math.floor(totalSeconds / 60);
  const remaining = totalSeconds % 60;

  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}
