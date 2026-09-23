/**
 * Возвращает порядок id, где `movingId` поставлен на позицию `targetOrder`.
 * Позиция зажимается в диапазон `[0, length]`, как в drag&drop: индекс за
 * пределами списка превращается в начало/конец.
 */
export function placeAtEnd(ids: string[], movingId: string, targetOrder: number): string[] {
  const without = ids.filter((id) => id !== movingId);
  const index = Math.max(0, Math.min(targetOrder, without.length));
  without.splice(index, 0, movingId);
  return without;
}
