import "server-only";

import { getSupabase } from "@/lib/supabase/server";
import type { FulfillmentOrderSnapshot } from "@/lib/admin/fulfillment";

type OrderRow = {
  id: string;
  payment_status: string;
  fulfillment_status: string;
  tracking_code: string | null;
  order_items: Array<{ sku: string }> | null;
};

export async function loadFulfillmentOrder(
  orderId: string,
): Promise<FulfillmentOrderSnapshot | null> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("id, payment_status, fulfillment_status, tracking_code, order_items ( sku )")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const row = data as OrderRow;
  return {
    id: row.id,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    trackingCode: row.tracking_code,
    items: row.order_items ?? [],
  };
}

export async function casStartPreparing(orderId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("orders")
    .update({ fulfillment_status: "preparing" })
    .eq("id", orderId)
    .eq("payment_status", "approved")
    .eq("fulfillment_status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function casConfirmShipment(
  orderId: string,
  trackingCode: string,
  shippedAtIso: string,
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("orders")
    .update({
      fulfillment_status: "shipped",
      tracking_code: trackingCode,
      shipped_at: shippedAtIso,
    })
    .eq("id", orderId)
    .eq("payment_status", "approved")
    .eq("fulfillment_status", "preparing")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function insertFulfillmentEvent(
  orderId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await getSupabase().from("order_events").insert({
    order_id: orderId,
    event_type: eventType,
    metadata,
  });
  if (error) {
    throw error;
  }
}
