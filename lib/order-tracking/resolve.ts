import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import { normalizeTrackingToken } from "@/lib/order-tracking/policy";
import { hashOrderTrackingToken } from "@/lib/order-tracking/token";
import { toOrderTrackingPublicView } from "@/lib/order-tracking/view-model";
import type {
  OrderTrackingPublicView,
  OrderTrackingStore,
} from "@/lib/order-tracking/types";

export type ResolveOrderTrackingResult =
  | { ok: true; view: OrderTrackingPublicView }
  | { ok: false; code: "NOT_FOUND" };

/**
 * Resolves a public tracking token to a minimized buyer view.
 * Invalid, revoked, unpaid, or digital-only tokens all return the same NOT_FOUND.
 */
export async function resolveOrderTracking(
  rawToken: string,
  store: OrderTrackingStore,
): Promise<ResolveOrderTrackingResult> {
  const normalized = normalizeTrackingToken(rawToken);
  if (!normalized) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const tokenHash = hashOrderTrackingToken(normalized);
  const access = await store.findAccessByTokenHash(tokenHash);
  if (!access || access.revokedAt) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const snapshot = await store.findOrderSnapshot(access.orderId);
  if (!snapshot) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (snapshot.paymentStatus !== "approved") {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (!snapshot.items.some((item) => item.sku === PHYSICAL_SKU)) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true, view: toOrderTrackingPublicView(snapshot) };
}
