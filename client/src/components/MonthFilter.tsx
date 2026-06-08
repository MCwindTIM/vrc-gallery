import { useMemo } from "react";
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

  return (
    <div className="relative w-full sm:min-w-[12rem] sm:max-w-[16rem] sm:w-auto">
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
    </div>
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
