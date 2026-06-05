interface MonthFilterProps {
  months: { month: string; count: number }[];
  active: string | null;
  onChange: (month: string | null) => void;
}

export function MonthFilter({ months, active, onChange }: MonthFilterProps) {
  const total = months.reduce((s, m) => s + m.count, 0);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 md:max-w-md lg:max-w-lg">
      <FilterChip
        label={`全部 (${total})`}
        active={active === null}
        onClick={() => onChange(null)}
      />
      {months.map((m) => (
        <FilterChip
          key={m.month}
          label={`${m.month} (${m.count})`}
          active={active === m.month}
          onClick={() => onChange(m.month)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition ${
        active
          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]"
          : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
      }`}
    >
      {label}
    </button>
  );
}
