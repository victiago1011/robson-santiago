import { assertIntegerCents } from "./money";
import {
  DIGITAL_SKU,
  EBOOK_BUMP_PROMOTION_CODE,
  PHYSICAL_QUANTITY,
  PHYSICAL_SKU,
  type PurchaseSelection,
} from "./selection";

export type QuoteProduct = {
  id: string;
  sku: string;
  title: string;
  type: "physical" | "digital";
  priceCents: number | null;
  currency: string;
  isActive: boolean;
};

export type CommerceCatalogSnapshot = {
  physical: QuoteProduct;
  digital: QuoteProduct;
  physicalShippingCents: number;
  ebookBumpPriceCents: number;
  currency: "BRL";
};

export type QuoteItem = {
  productId: string;
  sku: string;
  title: string;
  type: "physical" | "digital";
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type OrderQuote = {
  items: QuoteItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  currency: "BRL";
  promotionCode: string | null;
  ebookBump: boolean;
  ebookListPriceCents: number | null;
  ebookBumpPriceCents: number | null;
  shippingMethod: "flat_rate" | null;
  requiresShipping: boolean;
  purchasable: boolean;
};

export type PublicQuote = Omit<OrderQuote, "items"> & {
  items: Array<Omit<QuoteItem, "productId">>;
};

export class QuoteSelectionError extends Error {
  code: "INVALID_QUANTITY" | "CATALOG_INCOMPLETE";

  constructor(code: "INVALID_QUANTITY" | "CATALOG_INCOMPLETE") {
    super(code);
    this.name = "QuoteSelectionError";
    this.code = code;
  }
}

function requirePricedProduct(product: QuoteProduct): asserts product is QuoteProduct & { priceCents: number } {
  if (product.priceCents === null || product.priceCents <= 0 || !Number.isInteger(product.priceCents)) {
    throw new QuoteSelectionError("CATALOG_INCOMPLETE");
  }
}

function lineItem(product: QuoteProduct, quantity: number): QuoteItem {
  requirePricedProduct(product);
  return {
    productId: product.id,
    sku: product.sku,
    title: product.title,
    type: product.type,
    quantity,
    unitPriceCents: product.priceCents,
    lineTotalCents: product.priceCents * quantity,
  };
}

function isProductReady(product: QuoteProduct): boolean {
  return product.isActive && product.priceCents !== null && product.priceCents > 0;
}

export function toPublicQuote(quote: OrderQuote): PublicQuote {
  return {
    ...quote,
    items: quote.items.map((item) => ({
      sku: item.sku,
      title: item.title,
      type: item.type,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
  };
}

export function calculateQuoteFromCatalog(
  selection: PurchaseSelection,
  catalog: CommerceCatalogSnapshot,
): OrderQuote {
  assertIntegerCents(catalog.physicalShippingCents, "shipping");
  assertIntegerCents(catalog.ebookBumpPriceCents, "ebook_bump");

  if (catalog.currency !== "BRL" || catalog.physicalShippingCents <= 0 || catalog.ebookBumpPriceCents <= 0) {
    throw new QuoteSelectionError("CATALOG_INCOMPLETE");
  }

  if (catalog.physical.sku !== PHYSICAL_SKU || catalog.digital.sku !== DIGITAL_SKU) {
    throw new QuoteSelectionError("CATALOG_INCOMPLETE");
  }

  let items: QuoteItem[];
  let promotionCode: string | null = null;
  let discountCents = 0;
  let ebookBump = false;
  let purchasable: boolean;
  let ebookListPriceCents: number | null = null;
  let ebookBumpPriceCents: number | null = null;

  if (selection.kind === "physical") {
    const { quantity } = selection;
    if (!Number.isInteger(quantity) || quantity < PHYSICAL_QUANTITY.min || quantity > PHYSICAL_QUANTITY.max) {
      throw new QuoteSelectionError("INVALID_QUANTITY");
    }

    requirePricedProduct(catalog.digital);
    ebookListPriceCents = catalog.digital.priceCents;
    ebookBumpPriceCents = catalog.ebookBumpPriceCents;

    items = [lineItem(catalog.physical, quantity)];
    purchasable = isProductReady(catalog.physical);

    if (selection.ebookBump) {
      items = [...items, lineItem(catalog.digital, 1)];
      discountCents = Math.max(0, catalog.digital.priceCents - catalog.ebookBumpPriceCents);
      promotionCode = EBOOK_BUMP_PROMOTION_CODE;
      ebookBump = true;
      purchasable = purchasable && isProductReady(catalog.digital);
    }
  } else {
    items = [lineItem(catalog.digital, 1)];
    purchasable = isProductReady(catalog.digital);
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const requiresShipping = items.some((item) => item.type === "physical");
  const shippingCents = requiresShipping ? catalog.physicalShippingCents : 0;
  const shippingMethod = requiresShipping ? "flat_rate" : null;
  const totalCents = subtotalCents - discountCents + shippingCents;

  assertIntegerCents(subtotalCents, "subtotal");
  assertIntegerCents(discountCents, "discount");
  assertIntegerCents(shippingCents, "shipping");
  assertIntegerCents(totalCents, "total");

  return {
    items,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    currency: "BRL",
    promotionCode,
    ebookBump,
    ebookListPriceCents,
    ebookBumpPriceCents,
    shippingMethod,
    requiresShipping,
    purchasable,
  };
}
