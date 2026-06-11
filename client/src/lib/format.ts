/** Matches server PHOTO_TZ_OFFSET (+08:00) for consistent day/month grouping. */
const PHOTO_TIMEZONE = "Asia/Taipei";

/** YYYY-MM → 2024年3月 */
export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return `${year}年${Number(month)}月`;
}

export function photoLocalDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-CA", { timeZone: PHOTO_TIMEZONE });
}

export function photoLocalMonthKey(iso: string): string {
  return photoLocalDateKey(iso).slice(0, 7);
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-TW", {
    timeZone: PHOTO_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDayLabelFromKey(localDateKey: string): string {
  const [year, month, day] = localDateKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12));
  return d.toLocaleDateString("zh-TW", {
    timeZone: PHOTO_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: PHOTO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${pick("year")}/${pick("month")}/${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

export function aspectRatio(width: number, height: number): number {
  if (!width || !height) return 16 / 9;
  return width / height;
}
