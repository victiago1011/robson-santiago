export const MARKET_SLUGS = [
  "ibovespa", "dolar", "euro", "selic", "bitcoin", "ouro", "inflacao",
] as const;

export type MarketSlug = (typeof MARKET_SLUGS)[number];
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
  return { symbol: "—", label: "Estável ou sem variação informada", color: "text-slate-500" };
}

export function marketDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-");
  return day + "/" + month + "/" + year;
}
