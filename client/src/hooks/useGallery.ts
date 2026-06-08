import { useCallback, useEffect, useState } from "react";
import { fetchPhotos, fetchStats } from "../lib/api";
import type { GalleryStats, Photo } from "../types";

const PAGE_SIZE = 12;

export function useGallery() {
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoTotal, setPhotoTotal] = useState(0);

  const loadStats = useCallback(async () => {
    const data = await fetchStats();
    setStats(data);
  }, []);

  const loadPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      const data = await fetchPhotos({
        page: pageNum,
        limit: PAGE_SIZE,
        month,
      });
      setPhotos((prev) =>
        replace ? data.photos : [...prev, ...data.photos]
      );
      setPhotoTotal(data.total);
      setHasMore(data.hasMore);
      setPage(pageNum);
    },
    [month]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadStats();
        if (!cancelled) await loadPage(1, true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "載入失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, loadPage, loadStats]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, page, loadPage]);

  return {
    stats,
    photos,
    photoTotal,
    month,
    setMonth,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
  };
}
