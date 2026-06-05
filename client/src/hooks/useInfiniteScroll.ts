import { useEffect, useRef } from "react";

interface Options {
  enabled: boolean;
  rootMargin?: string;
}

export function useInfiniteScroll(
  onLoadMore: () => void,
  { enabled, rootMargin = "240px" }: Options
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, enabled, rootMargin]);

  return sentinelRef;
}
