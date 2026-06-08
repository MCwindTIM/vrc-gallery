import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const OVERLAY_DELAY_MS = 120;

interface ImageLoadProgress {
  src: string;
  progress: number;
  showPercent: boolean;
  showLoading: boolean;
  ready: boolean;
  markDecoded: () => void;
}

function isImageCached(url: string): boolean {
  const probe = new Image();
  probe.src = url;
  return probe.complete && probe.naturalWidth > 0;
}

export function useImageLoadProgress(url: string | undefined): ImageLoadProgress {
  const [src, setSrc] = useState("");
  const [progress, setProgress] = useState(0);
  const [showPercent, setShowPercent] = useState(false);
  const [decoded, setDecoded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [cached, setCached] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const markDecoded = useCallback(() => {
    setDecoded(true);
    setShowOverlay(false);
  }, []);

  useLayoutEffect(() => {
    if (!url) {
      setSrc("");
      setProgress(0);
      setShowPercent(false);
      setDecoded(false);
      setShowOverlay(false);
      setCached(false);
      return;
    }

    const hit = isImageCached(url);
    setCached(hit);

    if (hit) {
      setSrc(url);
      setProgress(100);
      setShowPercent(false);
      setDecoded(true);
      setShowOverlay(false);
      return;
    }

    setSrc("");
    setProgress(0);
    setShowPercent(false);
    setDecoded(false);
    setShowOverlay(false);
  }, [url]);

  useEffect(() => {
    if (!url || cached) return;

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    let cancelled = false;
    const overlayTimer = window.setTimeout(() => {
      if (!cancelled) setShowOverlay(true);
    }, OVERLAY_DELAY_MS);

    const revealOverlay = () => {
      window.clearTimeout(overlayTimer);
      if (!cancelled) setShowOverlay(true);
    };

    const startXhr = () => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = "blob";

      xhr.onprogress = (e) => {
        revealOverlay();
        if (e.lengthComputable && e.total > 0) {
          setShowPercent(true);
          setProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
        }
      };

      xhr.onload = () => {
        if (cancelled) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          const blobUrl = URL.createObjectURL(xhr.response);
          blobUrlRef.current = blobUrl;
          setSrc(blobUrl);
          setProgress(100);
          return;
        }
        setSrc(url);
        setProgress(100);
      };

      xhr.onerror = () => {
        if (cancelled) return;
        setSrc(url);
        setProgress(100);
      };

      xhr.send();
      return xhr;
    };

    let xhr: XMLHttpRequest | null = null;

    (async () => {
      try {
        const res = await fetch(url, {
          cache: "only-if-cached",
          mode: "same-origin",
        });
        if (cancelled) return;

        if (res.ok) {
          window.clearTimeout(overlayTimer);
          setSrc(url);
          setProgress(100);

          if (isImageCached(url)) {
            setDecoded(true);
            return;
          }

          const probe = new Image();
          probe.onload = () => {
            if (!cancelled) markDecoded();
          };
          probe.onerror = () => {
            if (!cancelled) xhr = startXhr();
          };
          probe.src = url;
          return;
        }
      } catch {
        // not in HTTP cache
      }

      if (!cancelled) xhr = startXhr();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(overlayTimer);
      xhr?.abort();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url, cached, markDecoded]);

  return {
    src,
    progress,
    showPercent,
    showLoading: showOverlay && !decoded,
    ready: decoded,
    markDecoded,
  };
}
