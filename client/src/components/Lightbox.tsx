import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Photo, PhotoAnnotation } from "../types";
import { formatDateTime } from "../lib/format";
import { computeRotatedImageLayout } from "../lib/rotatedImageFit";

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
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setRotation(0);
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

  const layout = useMemo(() => {
    if (!photo || stageSize.w < 1 || stageSize.h < 1) return null;
    return computeRotatedImageLayout(
      photo.width,
      photo.height,
      rotation,
      stageSize.w,
      stageSize.h
    );
  }, [photo, rotation, stageSize]);

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
                  className="relative flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div
                    className="invisible shrink-0"
                    style={{ width: layout.boxW, height: layout.boxH }}
                    aria-hidden
                  />
                  <img
                    src={photo.url}
                    alt={photo.name}
                    width={layout.imgW}
                    height={layout.imgH}
                    style={{
                      width: layout.imgW,
                      height: layout.imgH,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    }}
                    className="absolute left-1/2 top-1/2 max-w-none transition-transform duration-300 ease-out"
                    draggable={false}
                  />
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
          className={`font-ui break-words font-medium leading-snug text-neutral-100 ${
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
            <dd className="mt-0.5 break-words leading-snug text-neutral-200">{value}</dd>
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
