/** Gallery dates are shown in this timezone (matches PHOTO_TZ_OFFSET default +08:00). */
const PHOTO_TIMEZONE = process.env.PHOTO_TZ ?? "Asia/Taipei";

export function photoLocalDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-CA", { timeZone: PHOTO_TIMEZONE });
}

export function photoLocalMonthKey(iso: string): string {
  return photoLocalDateKey(iso).slice(0, 7);
}

export function photoLocalYear(iso: string): number {
  return Number(photoLocalDateKey(iso).slice(0, 4));
}
