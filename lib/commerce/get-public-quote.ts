import "server-only";

import { calculateOrderQuote } from "@/lib/commerce/calculate-order-quote";
import { toPublicQuote, type PublicQuote } from "@/lib/commerce/quote";
import type { PurchaseSelection } from "@/lib/commerce/selection";

export async function getPublicQuote(selection: PurchaseSelection): Promise<PublicQuote | null> {
  try {
    const quote = await calculateOrderQuote(selection);
    return toPublicQuote(quote);
  } catch {
    return null;
  }
}
