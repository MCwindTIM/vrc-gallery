import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPhotos, fetchStats } from "../lib/api";
import {
  parseMonthFromUrl,
  scrollGalleryIntoView,
  setMonthInUrl,
} from "../lib/monthUrl";
import type { GalleryStats, Photo } from "../types";

const PAGE_SIZE = 12;

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export function useGallery() {
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [month, setMonthState] = useState<string | null>(() =>
    parseMonthFromUrl()
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoTotal, setPhotoTotal] = useState(0);
  const monthRef = useRef(month);
  monthRef.current = month;

  const setMonth = useCallback((next: string | null) => {
    setMonthState(next);
    setMonthInUrl(next);
    scrollGalleryIntoView();
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setMonthState(parseMonthFromUrl());
      scrollGalleryIntoView();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const data = await fetchStats(ac.signal);
        if (!ac.signal.aborted) setStats(data);
      } catch (e) {
        if (!isAbortError(e)) {
          setError(e instanceof Error ? e.message : "載入失敗");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const requestMonth = month;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPhotos({
          page: 1,
          limit: PAGE_SIZE,
          month: requestMonth,
          signal: ac.signal,
        });
        if (ac.signal.aborted || requestMonth !== monthRef.current) return;

        setPhotos(data.photos);
        setPhotoTotal(data.total);
        setHasMore(data.hasMore);
        setPage(1);
      } catch (e) {
        if (isAbortError(e) || requestMonth !== monthRef.current) return;
        setError(e instanceof Error ? e.message : "載入失敗");
      } finally {
        if (!ac.signal.aborted && requestMonth === monthRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [month]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;

    const requestMonth = month;
    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const data = await fetchPhotos({
        page: nextPage,
        limit: PAGE_SIZE,
        month: requestMonth,
      });
      if (requestMonth !== monthRef.current) return;

      setPhotos((prev) => [...prev, ...data.photos]);
      setPhotoTotal(data.total);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (e) {
      if (requestMonth === monthRef.current) {
        setError(e instanceof Error ? e.message : "載入失敗");
      }
    } finally {
      if (requestMonth === monthRef.current) setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, page, month]);

  const displayTotal =
    month && stats
      ? (stats.months.find((m) => m.month === month)?.count ?? photoTotal)
      : photoTotal;

  return {
    stats,
    photos,
    photoTotal,
    displayTotal,
    month,
    setMonth,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
  };
}
