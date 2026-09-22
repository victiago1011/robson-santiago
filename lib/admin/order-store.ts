import "server-only";

import { z } from "zod";
import {
  adminPageWindow,
  friendlyOrderCode,
  toAdminOrderDetail,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type AdminOrderSource,
} from "@/lib/admin/orders";
import { getSupabase } from "@/lib/supabase/server";

const listedOrderSchema = z.object({
  id: z.uuid(),
  public_id: z.uuid(),
  created_at: z.string(),
  customer_name: z.string(),
  total_cents: z.number().int().nullable(),
  payment_status: z.string(),
  fulfillment_status: z.string(),
  physical_quantity: z.number().int().nonnegative(),
  has_ebook: z.boolean(),
});

const listPayloadSchema = z.object({
  total: z.number().int().nonnegative(),
  orders: z.array(listedOrderSchema),
});

const detailItemSchema = z.object({
  sku: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  unit_price_cents: z.number().int().nullable(),
  total_price_cents: z.number().int().nullable(),
});

const detailRowSchema = z.object({
  id: z.uuid(),
  public_id: z.uuid(),
  created_at: z.string(),
  paid_at: z.string().nullable(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string(),
  customer_document: z.string(),
  shipping_zip: z.string().nullable(),
  shipping_street: z.string().nullable(),
  shipping_number: z.string().nullable(),
  shipping_complement: z.string().nullable(),
  shipping_district: z.string().nullable(),
  shipping_city: z.string().nullable(),
  shipping_state: z.string().nullable(),
  subtotal_cents: z.number().int().nullable(),
  discount_cents: z.number().int(),
  shipping_cents: z.number().int().nullable(),
  total_cents: z.number().int().nullable(),
  payment_status: z.string(),
  fulfillment_status: z.string(),
  promotion_code: z.string().nullable(),
  order_items: z.array(detailItemSchema),
});

export type AdminOrderListPage = {
  total: number;
  page: number;
  pageSize: number;
  orders: AdminOrderListItem[];
};

export async function listPhysicalOrders(page: number): Promise<AdminOrderListPage> {
  const window = adminPageWindow(page);
  const { data, error } = await getSupabase().rpc("list_admin_physical_orders", {
    p_limit: window.limit,
    p_offset: window.offset,
  });

  if (error) {
    throw new Error("ADMIN_ORDERS_UNAVAILABLE");
  }

  const parsed = listPayloadSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("ADMIN_ORDERS_UNAVAILABLE");
  }

  return {
    total: parsed.data.total,
    page: window.page,
    pageSize: window.pageSize,
    orders: parsed.data.orders.map((row) => ({
      id: row.id,
      friendlyCode: friendlyOrderCode(row.public_id),
      createdAt: row.created_at,
      buyerName: row.customer_name,
      physicalQuantity: row.physical_quantity,
      hasEbook: row.has_ebook,
      totalCents: row.total_cents,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
    })),
  };
}

function sourceFromRow(row: z.infer<typeof detailRowSchema>): AdminOrderSource {
  return {
    id: row.id,
    publicId: row.public_id,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    buyerName: row.customer_name,
    email: row.customer_email,
    phone: row.customer_phone,
    document: row.customer_document,
    zip: row.shipping_zip,
    street: row.shipping_street,
    number: row.shipping_number,
    complement: row.shipping_complement,
    district: row.shipping_district,
    city: row.shipping_city,
    state: row.shipping_state,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    promotionCode: row.promotion_code,
    items: row.order_items.map((item) => ({
      sku: item.sku,
      title: item.title,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      totalPriceCents: item.total_price_cents,
    })),
  };
}

export async function findPhysicalOrder(id: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(
      `
      id,
      public_id,
      created_at,
      paid_at,
      customer_name,
      customer_email,
      customer_phone,
      customer_document,
      shipping_zip,
      shipping_street,
      shipping_number,
      shipping_complement,
      shipping_district,
      shipping_city,
      shipping_state,
      subtotal_cents,
      discount_cents,
      shipping_cents,
      total_cents,
      payment_status,
      fulfillment_status,
      promotion_code,
      order_items (
        sku,
        title,
        quantity,
        unit_price_cents,
        total_price_cents
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("ADMIN_ORDERS_UNAVAILABLE");
  }

  if (!data) {
    return null;
  }

  const parsed = detailRowSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("ADMIN_ORDERS_UNAVAILABLE");
  }

  return toAdminOrderDetail(sourceFromRow(parsed.data));
}
