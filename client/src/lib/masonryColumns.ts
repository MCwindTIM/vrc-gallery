export function masonryColumnCount(width = window.innerWidth): number {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

export function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const columns = Array.from({ length: columnCount }, () => [] as T[]);
  for (let i = 0; i < items.length; i++) {
    columns[i % columnCount].push(items[i]);
  }
  return columns;
}
