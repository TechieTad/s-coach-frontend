const eurFmt = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

/** "1 234,56 €" */
export function eur(n: number): string {
  return eurFmt.format(n);
}

/** whole-euro variant for big headline numbers */
export function eur0(n: number): string {
  return eurFmt.format(Math.round(n));
}

export function pctStr(n: number): string {
  return `${n > 0 ? "+" : ""}${Math.round(n)}%`;
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function timeStr(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
