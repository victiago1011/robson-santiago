import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import { generateOrderTrackingToken } from "@/lib/order-tracking/token";
import type { OrderTrackingStore } from "@/lib/order-tracking/types";

export type CreateOrderTrackingAccessResult =
  | { status: "created"; accessId: string; rawToken: string }
  | { status: "skipped"; reason: string };

/**
 * Always inserts a new authorization row. Does not revoke prior access rows.
 * Raw token is returned in memory only — never persist it.
 */
export async function createOrderTrackingAccess(
  orderId: string,
  store: OrderTrackingStore,
): Promise<CreateOrderTrackingAccessResult> {
  const snapshot = await store.findOrderSnapshot(orderId);
  if (!snapshot) {
    return { status: "skipped", reason: "order_not_found" };
  }
  if (snapshot.paymentStatus !== "approved") {
    return { status: "skipped", reason: "payment_not_approved" };
  }
  if (!snapshot.items.some((item) => item.sku === PHYSICAL_SKU)) {
    return { status: "skipped", reason: "no_physical_item" };
  }

  const token = generateOrderTrackingToken();
  const inserted = await store.insertAccess({
    orderId,
    tokenHash: token.tokenHash,
  });

  if (inserted.kind !== "inserted") {
    return { status: "skipped", reason: "insert_failed" };
  }

  return {
    status: "created",
    accessId: inserted.id,
    rawToken: token.rawToken,
  };
}

/**
 * Admin/ops helper to issue a tracking link for an existing physical order.
 * Does not send email. Does not revoke prior authorizations.
 */
export async function issueOrderTrackingAccess(
  orderId: string,
  store: OrderTrackingStore,
): Promise<CreateOrderTrackingAccessResult> {
  return createOrderTrackingAccess(orderId, store);
}
