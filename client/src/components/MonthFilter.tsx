import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatMonthLabel } from "../lib/format";

interface MonthFilterProps {
  months: { month: string; count: number }[];
  active: string | null;
  onChange: (month: string | null) => void;
}

export function MonthFilter({ months, active, onChange }: MonthFilterProps) {
  const total = months.reduce((s, m) => s + m.count, 0);

  const yearGroups = useMemo(() => {
    const groups = new Map<string, { month: string; count: number }[]>();
    for (const m of months) {
      const year = m.month.slice(0, 4);
      const list = groups.get(year) ?? [];
      list.push(m);
      groups.set(year, list);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [months]);

  const activeLabel = useMemo(() => {
    if (!active) return `全部 (${total})`;
    const hit = months.find((m) => m.month === active);
    return hit
      ? `${formatMonthLabel(active)} (${hit.count})`
      : formatMonthLabel(active);
  }, [active, months, total]);

  return (
    <>
      <div className="relative w-full sm:hidden">
        <NativeMonthSelect
          active={active}
          total={total}
          yearGroups={yearGroups}
          onChange={onChange}
        />
      </div>

      <DesktopMonthFilter
        active={active}
        activeLabel={activeLabel}
        total={total}
        yearGroups={yearGroups}
        onChange={onChange}
      />
    </>
  );
}

function NativeMonthSelect({
  active,
  total,
  yearGroups,
  onChange,
}: {
  active: string | null;
  total: number;
  yearGroups: [string, { month: string; count: number }[]][];
  onChange: (month: string | null) => void;
}) {
  return (
    <>
      <select
        id="month-filter"
        aria-label="依月份篩選"
        value={active ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-4 pr-10 text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      >
        <option value="">{`全部 (${total})`}</option>
        {yearGroups.map(([year, items]) => (
          <optgroup key={year} label={`${year} 年`}>
            {items.map((m) => (
              <option key={m.month} value={m.month}>
                {`${formatMonthLabel(m.month)} (${m.count})`}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
    </>
  );
}

function DesktopMonthFilter({
  active,
  activeLabel,
  total,
  yearGroups,
  onChange,
}: {
  active: string | null;
  activeLabel: string;
  total: number;
  yearGroups: [string, { month: string; count: number }[]][];
  onChange: (month: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (month: string | null) => {
    onChange(month);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="relative hidden w-full sm:block sm:min-w-[12rem] sm:max-w-[16rem] sm:w-auto"
    >
      <button
        type="button"
        id="month-filter-desktop"
        aria-label="依月份篩選"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-full border bg-[var(--color-surface)] py-2 pl-4 pr-3 text-left text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 ${
          open
            ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30"
            : "border-[var(--color-border)]"
        }`}
      >
        <span className="min-w-0 truncate">{activeLabel}</span>
        <ChevronIcon
          className={`shrink-0 text-[var(--color-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="月份選項"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+0.5rem)] z-30 max-h-[min(20rem,50dvh)] w-full min-w-[14rem] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_16px_48px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]"
          >
            <div className="max-h-[min(20rem,50dvh)] overflow-y-auto overscroll-contain py-1.5">
              <FilterOption
                selected={active === null}
                onClick={() => pick(null)}
                primary={`全部`}
                secondary={`${total} 張`}
              />

              {yearGroups.map(([year, items]) => (
                <div key={year}>
                  <p className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--color-panel)_92%,var(--color-surface))] px-3 py-1.5 text-[11px] font-medium tracking-wide text-[var(--color-muted)] backdrop-blur-sm">
                    {year} 年
                  </p>
                  {items.map((m) => (
                    <FilterOption
                      key={m.month}
                      selected={active === m.month}
                      onClick={() => pick(m.month)}
                      primary={formatMonthLabel(m.month)}
                      secondary={`${m.count} 張`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterOption({
  selected,
  onClick,
  primary,
  secondary,
}: {
  selected: boolean;
  onClick: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
        selected
          ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,var(--color-panel))] text-[var(--color-text)]"
          : "text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-panel))]"
      }`}
    >
      <span className="font-medium">{primary}</span>
      <span
        className={`shrink-0 text-xs tabular-nums ${
          selected ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
        }`}
      >
        {secondary}
      </span>
    </button>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
