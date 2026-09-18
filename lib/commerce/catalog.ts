import "server-only";

import { getSupabase, isSupabaseConfigured, SupabaseNotConfiguredError } from "@/lib/supabase/server";

export type CatalogProduct = {
  sku: string;
  title: string;
  type: "physical" | "digital";
  isbn: string | null;
  priceCents: number | null;
  currency: string;
  isActive: boolean;
};

type ProductRow = {
  sku: string;
  title: string;
  type: "physical" | "digital";
  isbn: string | null;
  price_cents: number | null;
  currency: string;
  is_active: boolean;
};

function mapProduct(row: ProductRow): CatalogProduct {
  return {
    sku: row.sku,
    title: row.title,
    type: row.type,
    isbn: row.isbn,
    priceCents: row.price_cents,
    currency: row.currency,
    isActive: row.is_active,
  };
}

export function isProductPurchasable(product: CatalogProduct): boolean {
  return product.isActive && product.priceCents !== null && product.priceCents > 0;
}

export async function getCatalogProductBySku(sku: string): Promise<CatalogProduct | null> {
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("sku, title, type, isbn, price_cents, currency, is_active")
    .eq("sku", sku)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProduct(data as ProductRow) : null;
}
