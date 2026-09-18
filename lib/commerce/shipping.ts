import "server-only";

export const SHIPPING_STRATEGIES = [
  "unconfigured",
  "free",
  "flat_rate",
  "external",
] as const;

export type ShippingStrategy = (typeof SHIPPING_STRATEGIES)[number];

export type ShippingQuote =
  | { configured: false; strategy: "unconfigured" }
  | { configured: true; strategy: Exclude<ShippingStrategy, "unconfigured">; amountCents: number };

/**
 * Frete ainda sem política definida.
 * Não usar 0, grátis ou valor fictício enquanto a estratégia for `unconfigured`.
 */
export const shippingConfig = {
  strategy: "unconfigured",
} as const satisfies { strategy: ShippingStrategy };

export function quoteShipping(): ShippingQuote {
  if (shippingConfig.strategy === "unconfigured") {
    return { configured: false, strategy: "unconfigured" };
  }

  throw new Error("SHIPPING_STRATEGY_NOT_IMPLEMENTED");
}
