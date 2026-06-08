/** YYYY-MM → 2024年3月 */
export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return `${year}年${Number(month)}月`;
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function aspectRatio(width: number, height: number): number {
  if (!width || !height) return 16 / 9;
  return width / height;
}
