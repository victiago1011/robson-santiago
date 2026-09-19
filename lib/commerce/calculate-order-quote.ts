import "server-only";

import { loadCommerceCatalog } from "@/lib/commerce/catalog";
import {
  calculateQuoteFromCatalog,
  type OrderQuote,
} from "@/lib/commerce/quote";
import type { PurchaseSelection } from "@/lib/commerce/selection";

export async function calculateOrderQuote(selection: PurchaseSelection): Promise<OrderQuote> {
  const catalog = await loadCommerceCatalog();
  return calculateQuoteFromCatalog(selection, catalog);
}
