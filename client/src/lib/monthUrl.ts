const MONTH_RE = /^\d{4}-\d{2}$/;

export function isValidMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function parseMonthFromUrl(search = window.location.search): string | null {
  const raw = new URLSearchParams(search).get("month");
  if (!raw || !isValidMonth(raw)) return null;
  return raw;
}

export function setMonthInUrl(month: string | null, replace = false): void {
  const url = new URL(window.location.href);
  if (month) url.searchParams.set("month", month);
  else url.searchParams.delete("month");

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;

  if (replace) window.history.replaceState({}, "", next);
  else window.history.pushState({}, "", next);
}

export function scrollGalleryIntoView(): void {
  document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
}
