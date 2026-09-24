/**
 * Ops/CLI store for issuing order tracking links outside the Next.js runtime.
 * App routes must keep using `@/lib/order-tracking/store` (Next server boundary).
 * This module must stay free of the Next server-boundary marker package and of
 * `@/lib/supabase/server` so plain Node/tsx can load it.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PHYSICAL_SKU } from "@/lib/commerce/selection";
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

type OrderSnapshotDbRow = {
  id: string;
  public_id: string;
  payment_status: string;
  fulfillment_status: string;
  customer_name: string;
  shipping_city: string | null;
  shipping_state: string | null;
  tracking_code: string | null;
  order_items: Array<{ sku: string; title: string; quantity: number }> | null;
};

function createOpsSupabaseClient(env: NodeJS.Dict<string>): SupabaseClient {
  const url = env.SUPABASE_URL?.trim();
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Builds an OrderTrackingStore backed by env credentials.
 * Client is created lazily on first use — importing this module needs no secrets.
 */
export function createOpsOrderTrackingStore(
  env: NodeJS.Dict<string> = process.env,
): OrderTrackingStore {
  let client: SupabaseClient | null = null;
  const getClient = (): SupabaseClient => {
    if (!client) {
      client = createOpsSupabaseClient(env);
    }
    return client;
  };

  const store: OrderTrackingStore = {
    async insertAccess({ orderId, tokenHash }) {
      const { data, error } = await getClient()
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
      const { data, error } = await getClient()
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
      const { data, error } = await getClient()
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
        order_items ( sku, title, quantity )
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

      const row = data as OrderSnapshotDbRow;
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
      };
    },

    async orderHasPhysicalItem(orderId) {
      const snapshot = await store.findOrderSnapshot(orderId);
      if (!snapshot) {
        return false;
      }
      return snapshot.items.some((item) => item.sku === PHYSICAL_SKU);
    },
  };

  return store;
}
