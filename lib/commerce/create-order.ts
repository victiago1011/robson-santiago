import "server-only";

import { calculateOrderQuote } from "@/lib/commerce/calculate-order-quote";
import { createOrderSchema, type CreateOrderInput } from "@/lib/commerce/schemas";
import type { PurchaseSelection } from "@/lib/commerce/selection";
import { QuoteSelectionError } from "@/lib/commerce/quote";
import { getSupabase, SupabaseNotConfiguredError } from "@/lib/supabase/server";

export type CommerceErrorCode =
  | "VALIDATION_ERROR"
  | "SUPABASE_NOT_CONFIGURED"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_NOT_AVAILABLE"
  | "CATALOG_UNAVAILABLE"
  | "ORDER_PERSISTENCE_FAILED";

export type CreateOrderFailure = {
  ok: false;
  code: CommerceErrorCode;
  status: number;
};

export type CreateOrderSuccess = { ok: true; publicId: string };

export type CreateOrderResult = CreateOrderSuccess | CreateOrderFailure;

export type ParsedCreateOrder =
  | { ok: true; data: CreateOrderInput }
  | CreateOrderFailure;

type CreatedOrderRow = {
  id: string;
  public_id: string;
};

export function parseCreateOrderInput(payload: unknown): ParsedCreateOrder {
  const parsed = createOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      status: 400,
    };
  }

  return { ok: true, data: parsed.data };
}

export function selectionFromCreateOrder(input: CreateOrderInput): PurchaseSelection {
  if (input.kind === "physical") {
    return { kind: "physical", quantity: input.quantity, ebookBump: input.ebookBump };
  }
  return { kind: "digital" };
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  try {
    const selection = selectionFromCreateOrder(input);
    const quote = await calculateOrderQuote(selection);

    if (!quote.purchasable) {
      return { ok: false, code: "PRODUCT_NOT_AVAILABLE", status: 409 };
    }

    if (quote.requiresShipping && input.kind === "digital") {
      return { ok: false, code: "VALIDATION_ERROR", status: 400 };
    }

    const shipping = input.kind === "digital" ? null : input.shipping;
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("create_commerce_order", {
      p_customer_name: input.customer.name,
      p_customer_email: input.customer.email,
      p_customer_phone: input.customer.phone,
      p_customer_document: input.customer.document,
      p_shipping_zip: shipping?.zip ?? null,
      p_shipping_street: shipping?.street ?? null,
      p_shipping_number: shipping?.number ?? null,
      p_shipping_complement: shipping?.complement ?? null,
      p_shipping_district: shipping?.district ?? null,
      p_shipping_city: shipping?.city ?? null,
      p_shipping_state: shipping?.state ?? null,
      p_promotion_code: quote.promotionCode,
      p_shipping_method: quote.shippingMethod,
      p_subtotal_cents: quote.subtotalCents,
      p_discount_cents: quote.discountCents,
      p_shipping_cents: quote.shippingCents,
      p_total_cents: quote.totalCents,
      p_currency: quote.currency,
      p_items: quote.items.map((item) => ({
        product_id: item.productId,
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents,
        total_price_cents: item.lineTotalCents,
      })),
      p_event_metadata: {
        kind: input.kind,
        promotion_code: quote.promotionCode,
      },
    });

    if (error || !data) {
      console.error("order_persist_failed", { code: error?.code ?? "NO_DATA" });
      return { ok: false, code: "ORDER_PERSISTENCE_FAILED", status: 503 };
    }

    const created = data as CreatedOrderRow;
    if (!created.public_id) {
      console.error("order_persist_failed", { code: "MISSING_PUBLIC_ID" });
      return { ok: false, code: "ORDER_PERSISTENCE_FAILED", status: 503 };
    }

    return { ok: true, publicId: created.public_id };
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return { ok: false, code: "SUPABASE_NOT_CONFIGURED", status: 503 };
    }

    if (error instanceof QuoteSelectionError) {
      return {
        ok: false,
        code: error.code === "INVALID_QUANTITY" ? "VALIDATION_ERROR" : "CATALOG_UNAVAILABLE",
        status: error.code === "INVALID_QUANTITY" ? 400 : 503,
      };
    }

    console.error("order_create_failed");
    return { ok: false, code: "CATALOG_UNAVAILABLE", status: 503 };
  }
}
