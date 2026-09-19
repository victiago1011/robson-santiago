import "server-only";

import { loadCommerceCatalog } from "@/lib/commerce/catalog";

/**
 * Frete fixo para pedidos com livro físico. Fonte: `commerce_settings`.
 * Pedidos só digitais não cobram frete.
 */
export async function getPhysicalShippingCents(): Promise<number> {
  const catalog = await loadCommerceCatalog();
  return catalog.physicalShippingCents;
}
