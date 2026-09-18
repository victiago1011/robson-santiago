import "server-only";

import { getCatalogProductBySku, isProductPurchasable } from "@/lib/commerce/catalog";
import { createOrderSchema, type CreateOrderInput } from "@/lib/commerce/schemas";
import { quoteShipping } from "@/lib/commerce/shipping";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

export type CommerceErrorCode =
  | "VALIDATION_ERROR"
  | "SUPABASE_NOT_CONFIGURED"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_NOT_AVAILABLE"
  | "SHIPPING_UNCONFIGURED"
  | "CHECKOUT_NOT_CONFIGURED";

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

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const shipping = quoteShipping();
  if (!shipping.configured) {
    return {
      ok: false,
      code: "SHIPPING_UNCONFIGURED",
      status: 409,
    };
  }

  try {
    const product = await getCatalogProductBySku(input.sku);

    if (!product) {
      return { ok: false, code: "PRODUCT_NOT_FOUND", status: 404 };
    }

    if (!isProductPurchasable(product)) {
      return { ok: false, code: "PRODUCT_NOT_AVAILABLE", status: 409 };
    }

    return {
      ok: false,
      code: "CHECKOUT_NOT_CONFIGURED",
      status: 409,
    };
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return { ok: false, code: "SUPABASE_NOT_CONFIGURED", status: 503 };
    }

    return { ok: false, code: "CHECKOUT_NOT_CONFIGURED", status: 503 };
  }
}
