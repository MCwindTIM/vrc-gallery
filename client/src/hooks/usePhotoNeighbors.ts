import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { fetchPhotoDetail } from "../lib/api";
import { photoLocalMonthKey } from "../lib/format";
import type { Photo } from "../types";

function withinMonth(photo: Photo | null, month: string | null): Photo | null {
  if (!photo) return null;
  if (!month) return photo;
  return photoLocalMonthKey(photo.date) === month ? photo : null;
}

function scopePhotos(photos: Photo[], month: string | null): Photo[] {
  if (!month) return photos;
  return photos.filter((p) => photoLocalMonthKey(p.date) === month);
}

/** 從已載入列表取得相鄰照片（新→舊排序） */
function neighborsInList(photoId: string, photos: Photo[]) {
  const index = photos.findIndex((p) => p.id === photoId);
  if (index < 0) return { prev: null as Photo | null, next: null as Photo | null };
  return {
    prev: photos[index + 1] ?? null,
    next: photos[index - 1] ?? null,
  };
}

function pickNeighbor(
  local: Photo | null,
  api: Photo | null,
  month: string | null,
  preferApi: boolean
) {
  const localOk = withinMonth(local, month);
  const apiOk = withinMonth(api, month);
  if (preferApi) return apiOk ?? localOk;
  return localOk ?? apiOk;
}

export function usePhotoNeighbors(
  photoId: string | undefined,
  month: string | null,
  loadedPhotos: Photo[],
  hasMore: boolean
) {
  const [apiPrev, setApiPrev] = useState<Photo | null>(null);
  const [apiNext, setApiNext] = useState<Photo | null>(null);

  const scopedPhotos = useMemo(
    () => scopePhotos(loadedPhotos, month),
    [loadedPhotos, month]
  );

  const local = useMemo(() => {
    if (!photoId) return { prev: null as Photo | null, next: null as Photo | null };
    return neighborsInList(photoId, scopedPhotos);
  }, [photoId, scopedPhotos]);

  const allLoaded = !hasMore && scopedPhotos.length > 0;

  useLayoutEffect(() => {
    setApiPrev(null);
    setApiNext(null);
  }, [photoId, month]);

  useEffect(() => {
    if (!photoId || allLoaded) return;

    const ac = new AbortController();
    fetchPhotoDetail(photoId, { month, signal: ac.signal })
      .then((data) => {
        if (!ac.signal.aborted) {
          setApiPrev(data.prev);
          setApiNext(data.next);
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!ac.signal.aborted) {
          setApiPrev(null);
          setApiNext(null);
        }
      });

    return () => ac.abort();
  }, [photoId, month, allLoaded]);

  if (allLoaded) {
    return {
      prev: withinMonth(local.prev, month),
      next: withinMonth(local.next, month),
    };
  }

  return {
    prev: pickNeighbor(local.prev, apiPrev, month, !!month),
    next: pickNeighbor(local.next, apiNext, month, !!month),
  };
}
