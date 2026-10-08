/** Reorder task ids after arrow up/down (visible list vs full list). */
export function buildMovedOrder(allItems, visibleItems, itemId, direction) {
  const visibleIndex = visibleItems.findIndex((item) => item.id === itemId);
  const targetVisibleIndex = visibleIndex + direction;
  if (visibleIndex < 0 || targetVisibleIndex < 0 || targetVisibleIndex >= visibleItems.length) {
    return null;
  }

  const targetId = visibleItems[targetVisibleIndex].id;
  const orderedIds = allItems.map((item) => item.id);
  const currentIndex = orderedIds.indexOf(itemId);
  const targetIndex = orderedIds.indexOf(targetId);
  if (currentIndex < 0 || targetIndex < 0) return null;

  const next = [...orderedIds];
  const [movedId] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, movedId);
  return next;
}

/** Reorder after drag-and-drop within a visible slice of the full task list. */
export function buildDragOrder(allItems, visibleItems, sourceIndex, destIndex) {
  if (sourceIndex === destIndex) return null;
  const orderedIds = allItems.map((item) => item.id);
  const visibleIds = visibleItems.map((v) => v.id);
  const slotIndices = visibleIds.map((id) => orderedIds.indexOf(id));
  if (slotIndices.some((i) => i < 0)) return null;

  const reorderedVisible = [...visibleIds];
  const [moved] = reorderedVisible.splice(sourceIndex, 1);
  reorderedVisible.splice(destIndex, 0, moved);

  const next = [...orderedIds];
  const sortedSlots = [...slotIndices].sort((a, b) => a - b);
  sortedSlots.forEach((pos, i) => {
    next[pos] = reorderedVisible[i];
  });
  return next;
}