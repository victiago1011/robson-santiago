export const MARKET_SLUGS = [
  "ibovespa", "dolar", "euro", "selic", "bitcoin", "ouro", "inflacao", "nasdaq", "sp500", "dowjones",
] as const;

export type BuiltinMarketSlug = (typeof MARKET_SLUGS)[number];
export type MarketSlug = string;

/** Stable lowercase ASCII identifier; the label remains freely editable. */
export function indicatorSlug(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function indicatorMatches(a: string, b: string) {
  return indicatorSlug(a) === indicatorSlug(b);
}
export type MarketDirection = "up" | "down" | "flat";

export type MarketIndicator = {
  slug: MarketSlug;
  label: string;
  display_value: string;
  variation: string;
  direction: MarketDirection;
  reference_on: string | null;
  visible: boolean;
  display_order: number;
};

export function publishedMarketIndicators(items: readonly MarketIndicator[]) {
  return items.filter((item) => item.visible && item.display_value.trim() && item.reference_on)
    .sort((a, b) => a.display_order - b.display_order);
}

export function marketMovement(direction: MarketDirection) {
  if (direction === "up") return { symbol: "▲", label: "Alta", color: "text-emerald-700" };
  if (direction === "down") return { symbol: "▼", label: "Queda", color: "text-rose-700" };
  return { symbol: "—", label: "Neutro", color: "text-slate-500" };
}

export function marketDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-");
  return day + "/" + month + "/" + year;
}

/** Never backfill a day from the latest quote. A missing snapshot is empty. */
export function indicatorsForEdition<T extends MarketIndicator & { edition_on: string }>(
  snapshots: readonly T[],
  editionOn: string,
): T[] {
  return snapshots.filter((item) => item.edition_on === editionOn);
}
