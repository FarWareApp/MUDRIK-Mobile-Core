export const MESSAGE_LIST_END_THRESHOLD_PX = 96;

export function isNearMessageListEnd(
  contentHeight: number,
  viewportHeight: number,
  offsetY: number,
): boolean {
  if (
    !Number.isFinite(contentHeight)
    || !Number.isFinite(viewportHeight)
    || !Number.isFinite(offsetY)
    || contentHeight < 0
    || viewportHeight < 0
    || offsetY < 0
  ) {
    return false;
  }

  const distanceFromEnd = Math.max(
    0,
    contentHeight - viewportHeight - offsetY,
  );

  return distanceFromEnd
    <= MESSAGE_LIST_END_THRESHOLD_PX;
}
