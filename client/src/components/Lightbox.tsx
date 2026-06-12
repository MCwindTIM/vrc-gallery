import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Photo, PhotoAnnotation } from "../types";
import { formatDateTime } from "../lib/format";
import {
  getPhotoDisplayLayout,
  photoDisplayOrientationLabel,
} from "../lib/photoDisplay";
import { useImageLoadProgress } from "../hooks/useImageLoadProgress";
import { computeRotatedImageLayout } from "../lib/rotatedImageFit";

const SWIPE_THRESHOLD_PX = 56;
const SWIPE_AXIS_LOCK_PX = 10;

interface LightboxProps {
  photo: Photo | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function Lightbox({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: LightboxProps) {
  const [rotation, setRotation] = useState(0);
  const [dragX, setDragX] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const swipeRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    axis: null as "x" | "y" | null,
  });
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const {
    src: imageSrc,
    progress,
    showPercent,
    showLoading,
    ready: imageReady,
    markDecoded,
  } = useImageLoadProgress(photo?.url);

  useEffect(() => {
    setRotation(0);
    setDragX(0);
  }, [photo?.id]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setStageSize({ w: rect.width, h: rect.height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    // 動畫結束後再量一次，避免開啟時高度為 0
    const t = window.setTimeout(update, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.clearTimeout(t);
    };
  }, [photo?.id]);

  const displayLayout = useMemo(() => {
    if (!photo) return null;
    return getPhotoDisplayLayout(
      photo.width,
      photo.height,
      photo.displayOrientation
    );
  }, [photo]);

  const layout = useMemo(() => {
    if (!photo || !displayLayout || stageSize.w < 1 || stageSize.h < 1) {
      return null;
    }
    return computeRotatedImageLayout(
      photo.width,
      photo.height,
      displayLayout.rotate + rotation,
      stageSize.w,
      stageSize.h
    );
  }, [photo, displayLayout, rotation, stageSize]);

  useEffect(() => {
    const img = imageRef.current;
    if (img?.complete && img.naturalWidth > 0) markDecoded();
  }, [imageSrc, markDecoded]);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
      if (e.key === "r" || e.key === "R") setRotation((r) => (r + 90) % 360);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [photo, onClose, onPrev, onNext, hasPrev, hasNext]);

  const imageTransform = useMemo(() => {
    const drag =
      dragX === 0
        ? ""
        : dragX > 0 && !hasPrev
          ? ` translateX(${dragX * 0.25}px)`
          : dragX < 0 && !hasNext
            ? ` translateX(${dragX * 0.25}px)`
            : ` translateX(${dragX}px)`;
    return `translate(-50%, -50%)${drag} rotate(${(displayLayout?.rotate ?? 0) + rotation}deg)`;
  }, [dragX, displayLayout?.rotate, hasPrev, hasNext, rotation]);

  const resetSwipe = () => {
    swipeRef.current.axis = null;
    swipeRef.current.pointerId = -1;
    setDragX(0);
  };

  const handleSwipePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    swipeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSwipePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (swipe.pointerId !== e.pointerId) return;

    const dx = e.clientX - swipe.startX;
    const dy = e.clientY - swipe.startY;

    if (!swipe.axis) {
      if (
        Math.abs(dx) < SWIPE_AXIS_LOCK_PX &&
        Math.abs(dy) < SWIPE_AXIS_LOCK_PX
      ) {
        return;
      }
      swipe.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }

    if (swipe.axis !== "x") return;

    e.preventDefault();
    setDragX(dx);
  };

  const handleSwipePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (swipe.pointerId !== e.pointerId) return;

    if (swipe.axis === "x") {
      if (swipe.startX - e.clientX > SWIPE_THRESHOLD_PX && hasNext) {
        onNext();
      } else if (e.clientX - swipe.startX > SWIPE_THRESHOLD_PX && hasPrev) {
        onPrev();
      }
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetSwipe();
  };

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          className="fixed inset-0 z-50 flex h-dvh w-full flex-col bg-[color-mix(in_srgb,var(--color-void)_55%,transparent)] backdrop-blur-2xl backdrop-saturate-150"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative flex h-full min-h-0 w-full flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              ref={stageRef}
              className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden p-1 sm:p-2"
            >
              {layout && (
                <div
                  className="relative flex touch-none cursor-grab items-center justify-center active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={handleSwipePointerDown}
                  onPointerMove={handleSwipePointerMove}
                  onPointerUp={handleSwipePointerEnd}
                  onPointerCancel={handleSwipePointerEnd}
                >
                  <div
                    className="invisible shrink-0"
                    style={{ width: layout.boxW, height: layout.boxH }}
                    aria-hidden
                  />
                  {showLoading && (
                    <div
                      className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center gap-3"
                      style={{
                        width: layout.imgW,
                        height: layout.imgH,
                        transform: imageTransform,
                      }}
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <img
                        src={photo.thumb}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-md"
                        draggable={false}
                      />
                      <div className="relative flex w-36 flex-col items-center gap-2.5 rounded-xl bg-black/35 px-4 py-3 backdrop-blur-sm">
                        {showPercent ? (
                          <>
                            <span className="font-ui text-sm font-medium tabular-nums text-neutral-100">
                              {progress}%
                            </span>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                              <div
                                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-150 ease-out"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <LoadingSpinner />
                            <span className="font-ui text-xs text-neutral-300">
                              載入中…
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {imageSrc && (
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      alt={photo.name}
                      width={layout.imgW}
                      height={layout.imgH}
                      onLoad={markDecoded}
                      onError={markDecoded}
                      style={{
                        width: layout.imgW,
                        height: layout.imgH,
                        transform: imageTransform,
                      }}
                      className={`absolute left-1/2 top-1/2 max-w-none select-none ${
                        dragX === 0
                          ? "transition-[opacity,transform] duration-300 ease-out"
                          : "transition-opacity duration-300 ease-out"
                      } ${imageReady ? "opacity-100" : "opacity-0"}`}
                      draggable={false}
                    />
                  )}
                </div>
              )}
            </div>

            <aside
              className="relative z-10 mx-auto mb-2 flex w-full max-w-md max-h-[min(38dvh,320px)] shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-[#121214]/92 px-3 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:mb-3 sm:max-w-sm sm:px-4 sm:py-4"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PhotoMetaPanel photo={photo} compact />
              <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <ToolbarButton
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  label="旋轉 ↻"
                  title="順時針旋轉 90°（R）"
                  compact
                />
                <NavButton disabled={!hasPrev} onClick={onPrev} label="上一張" />
                <NavButton disabled={!hasNext} onClick={onNext} label="下一張" />
              </div>
            </aside>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute right-2 top-2 z-20 rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-panel)_75%,transparent)] px-3 py-1.5 text-sm text-[var(--color-muted)] backdrop-blur-md hover:bg-[var(--color-panel)] hover:text-[var(--color-text)] sm:right-3 sm:top-3"
              aria-label="關閉"
            >
              ✕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-[var(--color-accent)]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

function PhotoMetaPanel({
  photo,
  compact = false,
}: {
  photo: Photo;
  compact?: boolean;
}) {
  const hasAnnotation = photo.annotation && hasAnnotationRows(photo.annotation);

  return (
    <div className="min-w-0 space-y-3">
      <div className="min-w-0">
        <h3
          className={`font-mixed-cjk break-words font-medium leading-snug text-neutral-100 ${
            compact ? "text-sm sm:text-base" : "text-base sm:text-lg"
          }`}
        >
          {photo.name}
        </h3>
        <p className="font-ui mt-0.5 text-xs text-neutral-400 sm:text-sm">
          {formatDateTime(photo.date)}
          {!compact && (
            <span className="text-neutral-500">
              {" "}
              · {photoDisplayOrientationLabel(
                photo.width,
                photo.height,
                photo.displayOrientation
              )}{" "}
              · {photo.width} × {photo.height}
            </span>
          )}
        </p>
      </div>

      {hasAnnotation && (
        <PhotoAnnotationBlock annotation={photo.annotation!} />
      )}
    </div>
  );
}

function hasAnnotationRows(annotation: PhotoAnnotation): boolean {
  return !!(
    annotation.world ||
    annotation.author ||
    annotation.userComment ||
    annotation.description
  );
}

function PhotoAnnotationBlock({ annotation }: { annotation: PhotoAnnotation }) {
  const rows: { label: string; value: string }[] = [];
  if (annotation.world) rows.push({ label: "世界", value: annotation.world });
  if (annotation.author) rows.push({ label: "拍攝者", value: annotation.author });
  if (annotation.userComment)
    rows.push({ label: "備註", value: annotation.userComment });
  if (annotation.description) rows.push({ label: "說明", value: annotation.description });
  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-sm">
      <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500">註解</p>
      <dl className="space-y-2.5">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-neutral-500">{label}</dt>
            <dd className="font-mixed-cjk mt-0.5 break-words leading-snug text-neutral-200">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  title,
  compact = false,
}: {
  onClick: () => void;
  label: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-lg border border-white/15 bg-white/5 text-sm text-neutral-200 transition hover:border-white/25 hover:bg-white/10 ${
        compact ? "px-3 py-1.5" : "w-full px-3 py-2"
      }`}
    >
      {label}
    </button>
  );
}

function NavButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-neutral-200 transition enabled:hover:border-white/25 enabled:hover:bg-white/10 disabled:opacity-30 sm:px-4"
    >
      {label}
    </button>
  );
}
