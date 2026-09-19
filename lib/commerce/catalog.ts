import "server-only";

import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import type { CommerceCatalogSnapshot, QuoteProduct } from "@/lib/commerce/quote";
import { getSupabase, isSupabaseConfigured, SupabaseNotConfiguredError } from "@/lib/supabase/server";

export type CatalogProduct = QuoteProduct;

type ProductRow = {
  id: string;
  sku: string;
  title: string;
  type: "physical" | "digital";
  isbn: string | null;
  price_cents: number | null;
  currency: string;
  is_active: boolean;
};

type SettingsRow = {
  ebook_bump_price_cents: number;
  currency: string;
};

type ShippingRateRow = {
  physical_quantity: number;
  shipping_cents: number;
  currency: string;
};

function mapProduct(row: ProductRow): QuoteProduct {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    type: row.type,
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
    .select("id, sku, title, type, isbn, price_cents, currency, is_active")
    .eq("sku", sku)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProduct(data as ProductRow) : null;
}

export async function loadCommerceCatalog(): Promise<CommerceCatalogSnapshot> {
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError();
  }

  const supabase = getSupabase();

  const [productsResult, settingsResult, ratesResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, title, type, isbn, price_cents, currency, is_active")
      .in("sku", [PHYSICAL_SKU, DIGITAL_SKU]),
    supabase
      .from("commerce_settings")
      .select("ebook_bump_price_cents, currency")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("commerce_shipping_rates")
      .select("physical_quantity, shipping_cents, currency"),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (ratesResult.error) throw ratesResult.error;

  const products = (productsResult.data ?? []) as ProductRow[];
  const physical = products.find((row) => row.sku === PHYSICAL_SKU);
  const digital = products.find((row) => row.sku === DIGITAL_SKU);
  const settings = settingsResult.data as SettingsRow | null;
  const rates = (ratesResult.data ?? []) as ShippingRateRow[];

  if (!physical || !digital || !settings || rates.length === 0) {
    throw new Error("CATALOG_INCOMPLETE");
  }

  if (settings.currency !== "BRL" || settings.ebook_bump_price_cents <= 0) {
    throw new Error("CATALOG_INCOMPLETE");
  }

  const physicalShippingRates: Record<number, number> = {};
  for (const rate of rates) {
    if (rate.currency !== "BRL" || rate.shipping_cents <= 0) {
      throw new Error("CATALOG_INCOMPLETE");
    }
    physicalShippingRates[rate.physical_quantity] = rate.shipping_cents;
  }

  return {
    physical: mapProduct(physical),
    digital: mapProduct(digital),
    physicalShippingRates,
    ebookBumpPriceCents: settings.ebook_bump_price_cents,
    currency: "BRL",
  };
}
