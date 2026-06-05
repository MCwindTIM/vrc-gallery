import fs from "node:fs/promises";
import path from "node:path";
import type { PhotoCatalog, PhotoRecord, PhotosQuery } from "../lib/types.js";
import { CATALOG_PATH } from "../lib/paths.js";

let cache: PhotoCatalog | null = null;
let catalogMtimeMs = 0;

function idFromUrl(url: string): string {
  const base = path.basename(url, path.extname(url));
  return base;
}

function enrich(raw: Omit<PhotoRecord, "id" | "year"> & { id?: string }): PhotoRecord {
  const id = raw.id ?? idFromUrl(raw.url);
  const year = new Date(raw.date).getFullYear();
  return { ...raw, id, year };
}

async function catalogMtime(): Promise<number> {
  const stat = await fs.stat(CATALOG_PATH);
  return stat.mtimeMs;
}

export async function loadCatalog(force = false): Promise<PhotoCatalog> {
  const mtime = await catalogMtime();
  if (cache && !force && mtime === catalogMtimeMs) return cache;

  const raw = await fs.readFile(CATALOG_PATH, "utf-8");
  const list = JSON.parse(raw) as Array<Omit<PhotoRecord, "id" | "year">>;
  const photos = list
    .map((p) => enrich(p))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  catalogMtimeMs = mtime;
  cache = {
    updatedAt: new Date().toISOString(),
    photos,
  };
  return cache;
}

export function filterPhotos(
  photos: PhotoRecord[],
  query: PhotosQuery
): PhotoRecord[] {
  let result = photos;

  if (query.month) {
    const m = query.month;
    result = result.filter((p) => {
      const key = p.date.slice(0, 7);
      return key === m || (m.length === 4 && p.year === Number(m));
    });
  } else if (query.year) {
    result = result.filter((p) => p.year === query.year);
  }

  if (query.q?.trim()) {
    const q = query.q.trim().toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(q));
  }

  return result;
}

export function paginate<T>(
  items: T[],
  page = 1,
  limit = 12
): { items: T[]; total: number; page: number; limit: number; hasMore: boolean } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const start = (safePage - 1) * safeLimit;
  const slice = items.slice(start, start + safeLimit);

  return {
    items: slice,
    total: items.length,
    page: safePage,
    limit: safeLimit,
    hasMore: start + slice.length < items.length,
  };
}

export function groupByDate(photos: PhotoRecord[]): Map<string, PhotoRecord[]> {
  const groups = new Map<string, PhotoRecord[]>();
  for (const photo of photos) {
    const key = photo.date.slice(0, 10);
    const bucket = groups.get(key) ?? [];
    bucket.push(photo);
    groups.set(key, bucket);
  }
  return groups;
}

export function getStats(photos: PhotoRecord[]) {
  const monthCounts = new Map<string, number>();
  for (const p of photos) {
    const month = p.date.slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }
  const months = [...monthCounts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, count]) => ({ month, count }));

  return {
    total: photos.length,
    months,
    latestDate: photos[0]?.date ?? null,
  };
}

export async function saveCatalog(photos: PhotoRecord[]): Promise<void> {
  const payload = photos.map(({ id, year, ...rest }) => rest);
  await fs.writeFile(CATALOG_PATH, JSON.stringify(payload, null, 2) + "\n");
  catalogMtimeMs = await catalogMtime();
  cache = {
    updatedAt: new Date().toISOString(),
    photos: photos.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  };
}
