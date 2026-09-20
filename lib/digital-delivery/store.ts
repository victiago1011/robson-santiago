import "server-only";

import { getSupabase } from "@/lib/supabase/server";
import type { OrderPaymentStatus } from "@/lib/payments/status";
import type {
  DigitalDeliveryStore,
  InsertDigitalDeliveryInput,
  InsertDigitalDeliveryResult,
} from "@/lib/digital-delivery/types";

type OrderRow = {
  id: string;
  payment_status: string;
  fulfillment_status: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
};

type ProductRow = {
  id: string;
  type: string;
  digital_file_path: string | null;
};

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export const supabaseDigitalDeliveryStore: DigitalDeliveryStore = {
  async findOrderById(orderId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_status, fulfillment_status")
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
      paymentStatus: row.payment_status as OrderPaymentStatus,
      fulfillmentStatus: row.fulfillment_status,
    };
  },

  async listOrderItems(orderId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, sku")
      .eq("order_id", orderId);

    if (error) {
      throw error;
    }

    return ((data as OrderItemRow[] | null) ?? []).map((row) => ({
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      sku: row.sku,
    }));
  },

  async findProductById(productId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("id, type, digital_file_path")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as ProductRow;
    return {
      id: row.id,
      type: row.type,
      digitalFilePath: row.digital_file_path,
    };
  },

  async insertDelivery(input: InsertDigitalDeliveryInput): Promise<InsertDigitalDeliveryResult> {
    const supabase = getSupabase();
    const { error } = await supabase.from("digital_deliveries").insert({
      order_id: input.orderId,
      order_item_id: input.orderItemId,
      product_id: input.productId,
      token_hash: input.tokenHash,
    });

    if (!error) {
      return { kind: "inserted" };
    }
    if (isUniqueViolation(error)) {
      return { kind: "conflict" };
    }
    throw error;
  },
};
