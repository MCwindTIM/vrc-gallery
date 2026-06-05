import type { GalleryStats, PhotosPage } from "../types";

const BASE = "/api";

/** 相容舊版 API（years）與新版（months） */
function normalizeGalleryStats(raw: Record<string, unknown>): GalleryStats {
  if (Array.isArray(raw.months)) {
    return raw as GalleryStats;
  }

  const years = raw.years as { year: number; count: number }[] | undefined;
  const months = (years ?? []).map(({ year, count }) => ({
    month: String(year),
    count,
  }));

  return {
    total: Number(raw.total) || 0,
    months,
    latestDate: (raw.latestDate as string | null) ?? null,
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function fetchStats(): Promise<GalleryStats> {
  const res = await fetch(`${BASE}/photos/stats`);
  if (!res.ok) throw new Error("Failed to load stats");
  const data = await res.json();
  return normalizeGalleryStats(data);
}

export async function fetchPhotos(params: {
  page?: number;
  limit?: number;
  month?: string | null;
  q?: string;
}): Promise<PhotosPage> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.month) {
    search.set("month", params.month);
    // 舊版 server 僅支援 year 篩選
    const year = params.month.slice(0, 4);
    if (/^\d{4}$/.test(year)) search.set("year", year);
  }
  if (params.q) search.set("q", params.q);

  const res = await fetch(`${BASE}/photos?${search}`);
  if (!res.ok) throw new Error("Failed to load photos");
  return res.json();
}
