/**
 * Ops/CLI store for issuing order tracking links outside the Next.js runtime.
 * App routes must keep using `@/lib/order-tracking/store` (Next server boundary).
 * This module must stay free of the Next server-boundary marker package and of
 * `@/lib/supabase/server` so plain Node/tsx can load it.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  ORDER_TRACKING_SNAPSHOT_SELECT,
  mapOrderTrackingSnapshot,
  type OrderTrackingSnapshotDbRow,
} from "@/lib/order-tracking/snapshot-map";
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
        .select(ORDER_TRACKING_SNAPSHOT_SELECT)
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }

      return mapOrderTrackingSnapshot(data as OrderTrackingSnapshotDbRow);
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
