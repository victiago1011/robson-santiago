import "server-only";

import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import { getSupabase } from "@/lib/supabase/server";
import type {
  OrderTrackingAccessRow,
  OrderTrackingOrderSnapshot,
  OrderTrackingStore,
} from "@/lib/order-tracking/types";

type AccessDbRow = {
  id: string;
  order_id: string;
  token_hash: string;
  revoked_at: string | null;
  created_at: string;
};

export const supabaseOrderTrackingStore: OrderTrackingStore = {
  async insertAccess({ orderId, tokenHash }) {
    const { data, error } = await getSupabase()
      .from("order_tracking_access")
      .insert({
        order_id: orderId,
        token_hash: tokenHash,
      })
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { kind: "error" };
    }
    return { kind: "inserted", id: (data as { id: string }).id };
  },

  async findAccessByTokenHash(tokenHash) {
    const { data, error } = await getSupabase()
      .from("order_tracking_access")
      .select("id, order_id, token_hash, revoked_at, created_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    const row = data as AccessDbRow;
    return {
      id: row.id,
      orderId: row.order_id,
      tokenHash: row.token_hash,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
    } satisfies OrderTrackingAccessRow;
  },

  async findOrderSnapshot(orderId): Promise<OrderTrackingOrderSnapshot | null> {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(
        `
        id,
        public_id,
        payment_status,
        fulfillment_status,
        customer_name,
        shipping_city,
        shipping_state,
        tracking_code,
        order_items ( id, sku, title, quantity ),
        digital_deliveries ( order_item_id, email_status, revoked_at, created_at )
      `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as {
      id: string;
      public_id: string;
      payment_status: string;
      fulfillment_status: string;
      customer_name: string;
      shipping_city: string | null;
      shipping_state: string | null;
      tracking_code: string | null;
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
    };

    return {
      orderId: row.id,
      publicId: row.public_id,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
      customerName: row.customer_name,
      shippingCity: row.shipping_city,
      shippingState: row.shipping_state,
      trackingCode: row.tracking_code,
      items: row.order_items ?? [],
      digitalDeliveries: (row.digital_deliveries ?? []).map((delivery) => ({
        orderItemId: delivery.order_item_id,
        emailStatus: delivery.email_status,
        revokedAt: delivery.revoked_at,
        createdAt: delivery.created_at,
      })),
    };
  },

  async orderHasPhysicalItem(orderId) {
    const snapshot = await this.findOrderSnapshot(orderId);
    if (!snapshot) {
      return false;
    }
    return snapshot.items.some((item) => item.sku === PHYSICAL_SKU);
  },
};
