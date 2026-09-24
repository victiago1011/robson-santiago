import type { OrderTrackingOrderSnapshot } from "@/lib/order-tracking/types";

export type OrderTrackingSnapshotDbRow = {
  id: string;
  public_id: string;
  payment_status: string;
  fulfillment_status: string;
  customer_name: string;
  shipping_city: string | null;
  shipping_state: string | null;
  tracking_code: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  order_items: Array<{
    id: string;
    sku: string;
    title: string;
    quantity: number;
  }> | null;
  digital_deliveries: Array<{
    order_item_id: string;
    email_status: string;
    revoked_at: string | null;
    created_at: string;
  }> | null;
  order_events: Array<{
    event_type: string;
    created_at: string;
  }> | null;
};

export const ORDER_TRACKING_SNAPSHOT_SELECT = `
  id,
  public_id,
  payment_status,
  fulfillment_status,
  customer_name,
  shipping_city,
  shipping_state,
  tracking_code,
  paid_at,
  shipped_at,
  order_items ( id, sku, title, quantity ),
  digital_deliveries ( order_item_id, email_status, revoked_at, created_at ),
  order_events ( event_type, created_at )
`;

function earliestPreparingStartedAt(
  events: Array<{ event_type: string; created_at: string }> | null,
): string | null {
  if (!events || events.length === 0) {
    return null;
  }
  const preparing = events
    .filter((event) => event.event_type === "fulfillment_preparing_started")
    .map((event) => event.created_at)
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .sort();
  return preparing[0] ?? null;
}

export function mapOrderTrackingSnapshot(
  row: OrderTrackingSnapshotDbRow,
): OrderTrackingOrderSnapshot {
  return {
    orderId: row.id,
    publicId: row.public_id,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    customerName: row.customer_name,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state,
    trackingCode: row.tracking_code,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at,
    preparingStartedAt: earliestPreparingStartedAt(row.order_events),
    items: row.order_items ?? [],
    digitalDeliveries: (row.digital_deliveries ?? []).map((delivery) => ({
      orderItemId: delivery.order_item_id,
      emailStatus: delivery.email_status,
      revokedAt: delivery.revoked_at,
      createdAt: delivery.created_at,
    })),
  };
}
