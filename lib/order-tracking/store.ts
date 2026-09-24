import "server-only";

import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  ORDER_TRACKING_SNAPSHOT_SELECT,
  mapOrderTrackingSnapshot,
  type OrderTrackingSnapshotDbRow,
} from "@/lib/order-tracking/snapshot-map";
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
    const snapshot = await this.findOrderSnapshot(orderId);
    if (!snapshot) {
      return false;
    }
    return snapshot.items.some((item) => item.sku === PHYSICAL_SKU);
  },
};
