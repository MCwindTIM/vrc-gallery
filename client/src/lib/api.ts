import type { GalleryStats, PhotoDetail, PhotosPage } from "../types";

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

function appendMonthFilter(search: URLSearchParams, month?: string | null) {
  if (!month) return;
  search.set("month", month);
  const year = month.slice(0, 4);
  if (/^\d{4}$/.test(year)) search.set("year", year);
}

export async function fetchStats(signal?: AbortSignal): Promise<GalleryStats> {
  const res = await fetch(`${BASE}/photos/stats`, { signal });
  if (!res.ok) throw new Error("Failed to load stats");
  const data = await res.json();
  return normalizeGalleryStats(data);
}

export async function fetchPhotos(params: {
  page?: number;
  limit?: number;
  month?: string | null;
  q?: string;
  signal?: AbortSignal;
}): Promise<PhotosPage> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  appendMonthFilter(search, params.month);
  if (params.q) search.set("q", params.q);

  const res = await fetch(`${BASE}/photos?${search}`, { signal: params.signal });
  if (!res.ok) throw new Error("Failed to load photos");
  return res.json();
}

export async function fetchPhotoDetail(
  id: string,
  params?: { month?: string | null; signal?: AbortSignal }
): Promise<PhotoDetail> {
  const search = new URLSearchParams();
  appendMonthFilter(search, params?.month);

  const res = await fetch(`${BASE}/photos/${encodeURIComponent(id)}?${search}`, {
    signal: params?.signal,
  });
  if (!res.ok) throw new Error("Failed to load photo");
  return res.json();
}
