import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Photo } from "../types";
import { formatDayLabel, formatMonthLabel, aspectRatio } from "../lib/format";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { usePhotoNeighbors } from "../hooks/usePhotoNeighbors";
import { MonthFilter } from "./MonthFilter";
import { Lightbox } from "./Lightbox";
import type { GalleryStats } from "../types";

const THUMB_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

interface GalleryProps {
  stats: GalleryStats | null;
  photos: Photo[];
  displayTotal: number;
  month: string | null;
  setMonth: (m: string | null) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
}

export function Gallery({
  stats,
  photos,
  displayTotal,
  month,
  setMonth,
  loading,
  loadingMore,
  hasMore,
  error,
  onLoadMore,
}: GalleryProps) {
  const [active, setActive] = useState<Photo | null>(null);
  const [animateGrid, setAnimateGrid] = useState(true);
  const scopedActive = useMemo(() => {
    if (!active) return null;
    if (month && active.date.slice(0, 7) !== month) return null;
    return active;
  }, [active, month]);

  const { prev, next } = usePhotoNeighbors(
    scopedActive?.id,
    month,
    photos,
    hasMore
  );

  useEffect(() => {
    setActive(null);
    setAnimateGrid(true);
  }, [month]);

  useEffect(() => {
    if (!loading && animateGrid) {
      const t = window.setTimeout(() => setAnimateGrid(false), 600);
      return () => window.clearTimeout(t);
    }
  }, [loading, animateGrid]);

  const groups = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of photos) {
      const key = p.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [photos]);

  const subtitle = useMemo(() => {
    if (loading && !stats) return "載入中…";
    const base = `${displayTotal} 張照片`;
    return month ? `${base} · ${formatMonthLabel(month)}` : base;
  }, [loading, stats, displayTotal, month]);

  const scrollSentinelRef = useInfiniteScroll(onLoadMore, {
    enabled: hasMore && !loading && !loadingMore,
  });

  return (
    <section id="gallery" className="px-6 pb-24 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">
              回憶收藏館
            </h2>
            <p className="mt-2 text-[var(--color-muted)]">{subtitle}</p>
          </div>
          {stats && (
            <MonthFilter
              months={stats.months ?? []}
              active={month}
              onChange={setMonth}
            />
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] animate-pulse rounded-2xl bg-[var(--color-panel)]"
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)]/60 px-6 py-12 text-center text-[var(--color-muted)]">
            {month
              ? `${formatMonthLabel(month)} 沒有照片`
              : "尚無照片"}
          </p>
        ) : (
          <div className="space-y-12">
            {groups.map(([day, items]) => (
              <div key={day}>
                <h3 className="font-ui mb-4 text-sm font-medium text-[var(--color-accent-2)]">
                  {formatDayLabel(items[0].date)}
                </h3>
                <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                  {items.map((photo, i) => (
                    <motion.button
                      key={photo.id}
                      type="button"
                      initial={
                        animateGrid ? { opacity: 0, y: 12 } : false
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        animateGrid
                          ? { delay: Math.min(i * 0.04, 0.4) }
                          : { duration: 0 }
                      }
                      onClick={() => setActive(photo)}
                      className="group mb-4 block w-full break-inside-avoid overflow-hidden text-left transition"
                    >
                      <div className="relative w-full overflow-hidden">
                        <img
                          src={photo.thumb}
                          alt={photo.name}
                          loading="lazy"
                          decoding="async"
                          sizes={THUMB_SIZES}
                          width={photo.width}
                          height={photo.height}
                          className="w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                          style={{
                            aspectRatio: String(
                              aspectRatio(photo.width, photo.height)
                            ),
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-void)]/90 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                        <p className="font-ui absolute bottom-0 left-0 right-0 translate-y-2 p-3 text-sm font-medium opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                          {photo.name}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && photos.length > 0 && (
          <div
            ref={scrollSentinelRef}
            className="mt-12 flex min-h-16 items-center justify-center"
            aria-hidden={!hasMore && !loadingMore}
          >
            {loadingMore && (
              <p className="text-sm text-[var(--color-muted)]">載入中…</p>
            )}
            {!hasMore && (
              <p className="text-sm text-[var(--color-muted)]">已顯示全部照片</p>
            )}
          </div>
        )}
      </div>

      <Lightbox
        photo={scopedActive}
        onClose={() => setActive(null)}
        onPrev={() => prev && setActive(prev)}
        onNext={() => next && setActive(next)}
        hasPrev={!!prev}
        hasNext={!!next}
      />
    </section>
  );
}
