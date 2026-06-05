import type { Metadata } from "sharp";

/** VRChat screenshots encode capture time in the filename (local time, no TZ). */
const VRCHAT_FILENAME_RE =
  /^VRChat_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})(?:\.(\d+))?/;

/** VRChat XMP uses +08:00; filename fallback uses the same offset when TZ is absent. */
const VRCHAT_LOCAL_OFFSET = process.env.PHOTO_TZ_OFFSET ?? "+08:00";

export function parseVrchatFilename(stem: string): Date | null {
  const m = stem.match(VRCHAT_FILENAME_RE);
  if (!m) return null;
  const [, ymd, h, min, sec, frac] = m;
  const ms = frac ? frac.padEnd(3, "0").slice(0, 3) : "000";
  const iso = `${ymd}T${h}:${min}:${sec}.${ms}${VRCHAT_LOCAL_OFFSET}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseXmpCreateDate(xmp?: Buffer): Date | null {
  if (!xmp?.length) return null;
  const text = xmp.toString("utf8");
  const m =
    text.match(/<xmp:CreateDate>([^<]+)<\/xmp:CreateDate>/) ??
    text.match(/<tiff:DateTime>([^<]+)<\/tiff:DateTime>/);
  if (!m) return null;
  const d = new Date(m[1]);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Prefer embedded capture metadata over filesystem times. */
export function resolvePhotoCreateDate(
  stem: string,
  meta: Pick<Metadata, "xmp">,
  fallback: Date
): Date {
  return parseXmpCreateDate(meta.xmp) ?? parseVrchatFilename(stem) ?? fallback;
}
