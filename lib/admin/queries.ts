import "server-only";

import { cache } from "react";
import { z } from "zod";
import {
  ADMIN_FACT_PAGE_SIZE,
  chooseDelivery,
  digitalDeliveryCopy,
  ebookOriginLabel,
  type AdminOrderFact,
  type CatalogPaymentFilter,
  type OrderComposition,
  type PaymentListFilter,
  type ShipmentFilter,
} from "@/lib/admin/catalog";
import {
  adminPageWindow,
  friendlyOrderCode,
  orderHasEbook,
  orderHasPhysicalBook,
  physicalQuantity,
  type AdminOrderItem,
} from "@/lib/admin/orders";
import type { AdminOrderRecord } from "@/lib/admin/order-screen";
import { PHYSICAL_SKU, DIGITAL_SKU } from "@/lib/commerce/selection";
import { getSupabase } from "@/lib/supabase/server";

const FACT_SELECT = `
  id,
  total_cents,
  payment_status,
  fulfillment_status,
  paid_at,
  created_at,
  order_items (
    sku,
    quantity
  )
`;

const LIST_CORE = `
  id,
  public_id,
  created_at,
  paid_at,
  customer_name,
  total_cents,
  payment_status,
  fulfillment_status,
  tracking_code,
  items:order_items (
    sku,
    title,
    quantity
  )
`;

const DETAIL_SELECT = `
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
  tracking_code,
  shipped_at,
  order_items (
    sku,
    title,
    quantity,
    unit_price_cents,
    total_price_cents
  ),
  payments (
    id,
    method,
    status,
    status_detail,
    installments,
    amount_cents,
    provider_payment_id,
    provider_order_id,
    created_at
  ),
  digital_deliveries (
    order_item_id,
    email_status,
    email_provider_accepted_at,
    email_sent_at,
    download_count,
    revoked_at,
    created_at
  ),
  order_events (
    id,
    event_type,
    metadata,
    created_at
  )
`;

const nested = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => value ?? [], z.array(schema));

const factSchema = z.object({
  id: z.uuid(),
  total_cents: z.number().int().nullable(),
  payment_status: z.string(),
  fulfillment_status: z.string(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
  order_items: nested(
    z.object({
      sku: z.string(),
      quantity: z.number().int().positive(),
    }),
  ),
});

const listItemSchema = z.object({
  sku: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
});

const deliverySchema = z.object({
  email_status: z.string(),
  email_provider_accepted_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  created_at: z.string(),
});

const listRowSchema = z.object({
  id: z.uuid(),
  public_id: z.uuid(),
  created_at: z.string(),
  paid_at: z.string().nullable(),
  customer_name: z.string(),
  total_cents: z.number().int().nullable(),
  payment_status: z.string(),
  fulfillment_status: z.string(),
  tracking_code: z.string().nullable(),
  items: nested(listItemSchema),
  deliveries: nested(deliverySchema),
});

const detailSchema = z.object({
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
  tracking_code: z.string().nullable(),
  shipped_at: z.string().nullable(),
  order_items: nested(
    z.object({
      sku: z.string(),
      title: z.string(),
      quantity: z.number().int().positive(),
      unit_price_cents: z.number().int().nullable(),
      total_price_cents: z.number().int().nullable(),
    }),
  ),
  payments: nested(
    z.object({
      id: z.uuid(),
      method: z.string().nullable(),
      status: z.string(),
      status_detail: z.string().nullable(),
      installments: z.number().int().nullable(),
      amount_cents: z.number().int().nullable(),
      provider_payment_id: z.string().nullable(),
      provider_order_id: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
  digital_deliveries: nested(
    z.object({
      order_item_id: z.uuid(),
      email_status: z.string(),
      email_provider_accepted_at: z.string().nullable(),
      email_sent_at: z.string().nullable(),
      download_count: z.number().int().nonnegative(),
      revoked_at: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
  order_events: nested(
    z.object({
      id: z.uuid(),
      event_type: z.string(),
      metadata: z.unknown(),
      created_at: z.string(),
    }),
  ),
});

export type AdminListRow = {
  id: string;
  friendlyCode: string;
  createdAt: string;
  paidAt: string | null;
  buyerName: string;
  items: AdminOrderItem[];
  totalCents: number | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  physicalQuantity: number;
  hasEbook: boolean;
  hasPhysical: boolean;
  trackingCode: string | null;
};

export type EbookListRow = AdminListRow & {
  originLabel: string;
  deliveryLabel: string;
  providerLabel: string;
};

export type AdminListPage<T> = {
  total: number;
  page: number;
  pageSize: number;
  rows: T[];
};

export type AdminOrderLookup =
  | { ok: true; order: AdminOrderRecord }
  | { ok: false; reason: "missing" | "unavailable" };

function toFact(row: z.infer<typeof factSchema>): AdminOrderFact {
  return {
    id: row.id,
    totalCents: row.total_cents,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    items: row.order_items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
    })),
  };
}

function toListRow(row: z.infer<typeof listRowSchema>): AdminListRow {
  const items = row.items.map((item) => ({
    sku: item.sku,
    title: item.title,
    quantity: item.quantity,
    unitPriceCents: null,
    totalPriceCents: null,
  }));
  const tracking = row.tracking_code?.trim();
  return {
    id: row.id,
    friendlyCode: friendlyOrderCode(row.public_id),
    createdAt: row.created_at,
    paidAt: row.paid_at,
    buyerName: row.customer_name,
    items,
    totalCents: row.total_cents,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    physicalQuantity: physicalQuantity(items),
    hasEbook: orderHasEbook(items),
    hasPhysical: orderHasPhysicalBook(items),
    trackingCode: tracking ? tracking : null,
  };
}

function toEbookRow(row: z.infer<typeof listRowSchema>): EbookListRow | null {
  const list = toListRow(row);
  const origin = ebookOriginLabel(list.items);
  if (!origin) {
    return null;
  }
  const copy = digitalDeliveryCopy(
    list.paymentStatus,
    chooseDelivery(
      (row.deliveries ?? []).map((delivery) => ({
        emailStatus: delivery.email_status,
        providerAcceptedAt: delivery.email_provider_accepted_at,
        revokedAt: delivery.revoked_at,
        createdAt: delivery.created_at,
      })),
    ),
  );
  return {
    ...list,
    originLabel: origin,
    deliveryLabel: copy.delivery,
    providerLabel: copy.provider,
  };
}

function parseListPage(data: unknown, total: number, page: number): AdminListPage<AdminListRow> | null {
  const parsed = z.array(listRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    return null;
  }
  const window = adminPageWindow(page);
  return {
    total,
    page: window.page,
    pageSize: window.pageSize,
    rows: parsed.data.map(toListRow),
  };
}

function catalogSelect(composition: OrderComposition): string {
  if (composition === "physical") {
    return `${LIST_CORE}, physical:order_items!inner(sku)`;
  }
  if (composition === "ebook") {
    return `${LIST_CORE}, ebook:order_items!inner(sku)`;
  }
  if (composition === "both") {
    return `${LIST_CORE}, physical:order_items!inner(sku), ebook:order_items!inner(sku)`;
  }
  return LIST_CORE;
}

export const loadAdminOrderFacts = cache(async (): Promise<AdminOrderFact[] | null> => {
  const facts: AdminOrderFact[] = [];
  let offset = 0;

  while (offset <= 20_000) {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(FACT_SELECT)
      .order("id", { ascending: true })
      .range(offset, offset + ADMIN_FACT_PAGE_SIZE - 1);

    if (error) {
      return null;
    }

    const parsed = z.array(factSchema).safeParse(data ?? []);
    if (!parsed.success) {
      return null;
    }

    facts.push(...parsed.data.map(toFact));
    if (parsed.data.length < ADMIN_FACT_PAGE_SIZE) {
      return facts;
    }
    offset += ADMIN_FACT_PAGE_SIZE;
  }

  return facts;
});

export async function listAttentionOrders(limit: number): Promise<AdminListRow[] | null> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(`${LIST_CORE}, physical:order_items!inner(sku)`)
    .eq("physical.sku", PHYSICAL_SKU)
    .eq("payment_status", "approved")
    .in("fulfillment_status", ["pending", "preparing"])
    .order("paid_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    return null;
  }

  const parsed = z.array(listRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    return null;
  }
  return parsed.data.map(toListRow);
}

export async function listFilteredPhysicalOrders(
  page: number,
  filter: ShipmentFilter,
): Promise<AdminListPage<AdminListRow> | null> {
  const window = adminPageWindow(page);
  let query = getSupabase()
    .from("orders")
    .select(`${LIST_CORE}, physical:order_items!inner(sku)`, { count: "exact" })
    .eq("physical.sku", PHYSICAL_SKU);

  if (filter === "awaiting") {
    query = query
      .eq("payment_status", "approved")
      .in("fulfillment_status", ["pending", "preparing"])
      .order("paid_at", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (filter === "shipped") {
    query = query.eq("fulfillment_status", "shipped");
  } else if (filter === "delivered") {
    query = query.eq("fulfillment_status", "delivered");
  }

  if (filter !== "awaiting") {
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
  }

  const { data, error, count } = await query.range(
    window.offset,
    window.offset + window.limit - 1,
  );
  if (error || count === null) {
    return null;
  }
  return parseListPage(data, count, page);
}

export async function listCatalogOrders(
  page: number,
  composition: OrderComposition,
  payment: CatalogPaymentFilter,
): Promise<AdminListPage<AdminListRow> | null> {
  const window = adminPageWindow(page);
  let query = getSupabase()
    .from("orders")
    .select(catalogSelect(composition), { count: "exact" });

  if (composition === "physical" || composition === "both") {
    query = query.eq("physical.sku", PHYSICAL_SKU);
  }
  if (composition === "ebook" || composition === "both") {
    query = query.eq("ebook.sku", DIGITAL_SKU);
  }
  if (payment !== "all") {
    query = query.eq("payment_status", payment);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(window.offset, window.offset + window.limit - 1);

  if (error || count === null) {
    return null;
  }
  return parseListPage(data, count, page);
}

export async function listEbookOrders(page: number): Promise<AdminListPage<EbookListRow> | null> {
  const window = adminPageWindow(page);
  const { data, error, count } = await getSupabase()
    .from("orders")
    .select(
      `${LIST_CORE},
      deliveries:digital_deliveries (
        email_status,
        email_provider_accepted_at,
        revoked_at,
        created_at
      ),
      ebook:order_items!inner(sku)`,
      { count: "exact" },
    )
    .eq("ebook.sku", DIGITAL_SKU)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(window.offset, window.offset + window.limit - 1);

  if (error || count === null) {
    return null;
  }

  const parsed = z.array(listRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    return null;
  }

  const rows = parsed.data.flatMap((row) => {
    const ebook = toEbookRow(row);
    return ebook ? [ebook] : [];
  });

  return {
    total: count,
    page: window.page,
    pageSize: window.pageSize,
    rows,
  };
}

export async function listPaymentOrders(
  page: number,
  filter: PaymentListFilter,
): Promise<AdminListPage<AdminListRow> | null> {
  const window = adminPageWindow(page);
  let query = getSupabase().from("orders").select(LIST_CORE, { count: "exact" });

  if (filter === "declined") {
    query = query.in("payment_status", ["rejected", "cancelled"]);
  } else if (filter !== "all") {
    query = query.eq("payment_status", filter);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(window.offset, window.offset + window.limit - 1);

  if (error || count === null) {
    return null;
  }
  return parseListPage(data, count, page);
}

export async function findAdminOrder(id: string): Promise<AdminOrderLookup> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "unavailable" };
  }
  if (!data) {
    return { ok: false, reason: "missing" };
  }

  const parsed = detailSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, reason: "unavailable" };
  }

  const row = parsed.data;
  return {
    ok: true,
    order: {
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
      trackingCode: row.tracking_code,
      shippedAt: row.shipped_at,
      items: row.order_items.map((item) => ({
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        totalPriceCents: item.total_price_cents,
      })),
      payments: row.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        status: payment.status,
        statusDetail: payment.status_detail,
        installments: payment.installments,
        amountCents: payment.amount_cents,
        providerPaymentId: payment.provider_payment_id,
        providerOrderId: payment.provider_order_id,
        createdAt: payment.created_at,
      })),
      deliveries: row.digital_deliveries.map((delivery) => ({
        emailStatus: delivery.email_status,
        providerAcceptedAt: delivery.email_provider_accepted_at,
        revokedAt: delivery.revoked_at,
        createdAt: delivery.created_at,
        emailSentAt: delivery.email_sent_at,
        downloadCount: delivery.download_count,
      })),
      events: row.order_events.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        metadata: event.metadata,
        createdAt: event.created_at,
      })),
    },
  };
}
