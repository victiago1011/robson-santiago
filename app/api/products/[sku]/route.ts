import { NextResponse } from "next/server";
import { getCatalogProductBySku, isProductPurchasable } from "@/lib/commerce/catalog";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ sku: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { sku } = await context.params;

  try {
    const product = await getCatalogProductBySku(sku);

    if (!product) {
      return NextResponse.json(
        { ok: false, code: "PRODUCT_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      product: {
        sku: product.sku,
        title: product.title,
        priceCents: product.priceCents,
        currency: product.currency,
        available: isProductPurchasable(product),
      },
    });
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) {
      return NextResponse.json(
        { ok: false, code: "SUPABASE_NOT_CONFIGURED", available: false },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: false, code: "CATALOG_UNAVAILABLE", available: false },
      { status: 503 },
    );
  }
}
