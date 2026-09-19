import "server-only";

import { loadCommerceCatalog } from "@/lib/commerce/catalog";

/**
 * Frete por quantidade de livros físicos. Fonte: `commerce_shipping_rates`.
 * Pedidos só digitais não cobram frete.
 */
export async function getPhysicalShippingCents(quantity: number): Promise<number> {
  const catalog = await loadCommerceCatalog();
  const shippingCents = catalog.physicalShippingRates[quantity];
  if (shippingCents === undefined) {
    throw new Error("CATALOG_INCOMPLETE");
  }
  return shippingCents;
}
