import assert from "node:assert/strict";
import { test } from "node:test";
import { orderSummaryPricing } from "./order-summary-pricing";
import { calculateQuoteFromCatalog, toPublicQuote, type CommerceCatalogSnapshot } from "./quote";
import { createOrderSchema, purchaseSelectionSchema } from "./schemas";

function catalog(overrides?: {
  physicalActive?: boolean;
  digitalActive?: boolean;
}): CommerceCatalogSnapshot {
  return {
    physical: {
      id: "11111111-1111-1111-1111-111111111111",
      sku: "AVIDA-FISICO",
      title: "A Vida é um Dia",
      type: "physical",
      priceCents: 3990,
      currency: "BRL",
      isActive: overrides?.physicalActive ?? false,
    },
    digital: {
      id: "22222222-2222-2222-2222-222222222222",
      sku: "AVIDA-EBOOK",
      title: "A Vida é um Dia — E-book",
      type: "digital",
      priceCents: 1990,
      currency: "BRL",
      isActive: overrides?.digitalActive ?? false,
    },
    physicalShippingRates: {
      1: 1500,
      2: 2000,
      3: 2500,
      4: 3000,
    },
    ebookBumpPriceCents: 1000,
    currency: "BRL",
  };
}

const customer = {
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "11999999999",
  document: "529.982.247-25",
};

const shipping = {
  zip: "01310-100",
  street: "Avenida Paulista",
  number: "1000",
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP" as const,
};

test("físico 1 → frete 1500 total 5490", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: false },
    catalog(),
  );
  assert.equal(quote.subtotalCents, 3990);
  assert.equal(quote.discountCents, 0);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 5490);
});

test("físico 2 → frete 2000 total 9980", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 2, ebookBump: false },
    catalog(),
  );
  assert.equal(quote.subtotalCents, 7980);
  assert.equal(quote.shippingCents, 2000);
  assert.equal(quote.totalCents, 9980);
});

test("físico 3 → frete 2500 total 14470", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 3, ebookBump: false },
    catalog(),
  );
  assert.equal(quote.subtotalCents, 11970);
  assert.equal(quote.shippingCents, 2500);
  assert.equal(quote.totalCents, 14470);
});

test("físico 4 → frete 3000 total 18960", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 4, ebookBump: false },
    catalog(),
  );
  assert.equal(quote.subtotalCents, 15960);
  assert.equal(quote.shippingCents, 3000);
  assert.equal(quote.totalCents, 18960);
});

test("físico 5 é rejeitado", () => {
  assert.equal(
    purchaseSelectionSchema.safeParse({ kind: "physical", quantity: 5, ebookBump: false }).success,
    false,
  );
  assert.throws(() =>
    calculateQuoteFromCatalog({ kind: "physical", quantity: 5, ebookBump: false }, catalog()),
  );
});

test("rejeita quantidade 0", () => {
  assert.equal(
    purchaseSelectionSchema.safeParse({ kind: "physical", quantity: 0, ebookBump: false }).success,
    false,
  );
  assert.throws(() =>
    calculateQuoteFromCatalog({ kind: "physical", quantity: 0, ebookBump: false }, catalog()),
  );
});

test("físico 1 com bump total 6490", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: true },
    catalog(),
  );
  assert.equal(quote.items.filter((item) => item.sku === "AVIDA-EBOOK").length, 1);
  assert.equal(quote.items.find((item) => item.sku === "AVIDA-EBOOK")?.quantity, 1);
  assert.equal(quote.subtotalCents, 5980);
  assert.equal(quote.discountCents, 990);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 6490);
  assert.equal(quote.promotionCode, "AVIDA-EBOOK-BUMP");
});

test("físico 2 com bump: 1 e-book, desconto 990, frete 2000", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 2, ebookBump: true },
    catalog(),
  );
  assert.equal(quote.items.find((item) => item.sku === "AVIDA-EBOOK")?.quantity, 1);
  assert.equal(quote.subtotalCents, 9970);
  assert.equal(quote.discountCents, 990);
  assert.equal(quote.shippingCents, 2000);
  assert.equal(quote.totalCents, 10980);
});

test("físico 4 com bump: 1 e-book, desconto 990, frete 3000", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 4, ebookBump: true },
    catalog(),
  );
  assert.equal(quote.items.find((item) => item.sku === "AVIDA-EBOOK")?.quantity, 1);
  assert.equal(quote.subtotalCents, 17950);
  assert.equal(quote.discountCents, 990);
  assert.equal(quote.shippingCents, 3000);
  assert.equal(quote.totalCents, 19960);
});

test("digital total 1990 sem frete", () => {
  const quote = calculateQuoteFromCatalog({ kind: "digital" }, catalog());
  assert.equal(quote.subtotalCents, 1990);
  assert.equal(quote.discountCents, 0);
  assert.equal(quote.shippingCents, 0);
  assert.equal(quote.totalCents, 1990);
  assert.equal(quote.requiresShipping, false);
});

test("digital não aceita ebookBump", () => {
  assert.equal(
    purchaseSelectionSchema.safeParse({ kind: "digital", ebookBump: true }).success,
    false,
  );
});

test("físico exige endereço", () => {
  assert.equal(
    createOrderSchema.safeParse({
      kind: "physical",
      quantity: 1,
      ebookBump: false,
      customer,
    }).success,
    false,
  );
  assert.equal(
    createOrderSchema.safeParse({
      kind: "physical",
      quantity: 1,
      ebookBump: true,
      customer,
      shipping,
    }).success,
    true,
  );
});

test("digital não exige endereço", () => {
  assert.equal(
    createOrderSchema.safeParse({
      kind: "digital",
      customer,
    }).success,
    true,
  );
});

test("payload financeiro extra é rejeitado", () => {
  assert.equal(
    createOrderSchema.safeParse({
      kind: "physical",
      quantity: 1,
      ebookBump: true,
      customer,
      shipping,
      priceCents: 1,
      discountCents: 0,
      shippingCents: 0,
      totalCents: 1,
    }).success,
    false,
  );
  assert.equal(
    purchaseSelectionSchema.safeParse({
      kind: "physical",
      quantity: 2,
      ebookBump: false,
      totalCents: 1,
    }).success,
    false,
  );
});

test("catálogo inativo impede persistência", () => {
  const inactive = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: true },
    catalog(),
  );
  assert.equal(inactive.purchasable, false);

  const active = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: true },
    catalog({ physicalActive: true, digitalActive: true }),
  );
  assert.equal(active.purchasable, true);
});

test("resumo do combo usa o preço líquido do bump e o avulso permanece cheio", () => {
  const combo = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: true },
    catalog(),
  );
  const pricing = orderSummaryPricing(combo);
  assert.equal(pricing.mode, "combo_net");
  if (pricing.mode !== "combo_net") {
    return;
  }
  assert.equal(pricing.ebookNetCents, combo.ebookBumpPriceCents);
  assert.equal(pricing.showSubtotal, false);
  assert.equal(pricing.showEbookDiscount, false);

  const physical = combo.items.find((item) => item.type === "physical");
  const digital = combo.items.find((item) => item.type === "digital");
  assert.ok(physical);
  assert.ok(digital);
  assert.equal(physical.lineTotalCents + pricing.ebookNetCents + combo.shippingCents, combo.totalCents);
  assert.equal(combo.totalCents, 6490);
  assert.notEqual(pricing.ebookNetCents, digital.lineTotalCents);

  const digitalOnly = calculateQuoteFromCatalog({ kind: "digital" }, catalog());
  const standalone = orderSummaryPricing(digitalOnly);
  assert.equal(standalone.mode, "standard");
  assert.equal(standalone.showSubtotal, true);
  assert.equal(standalone.showEbookDiscount, false);
  assert.equal(digitalOnly.items[0]?.lineTotalCents, 1990);
  assert.equal(digitalOnly.totalCents, 1990);

  const mismatched = toPublicQuote(combo);
  mismatched.discountCents = 1;
  const fallback = orderSummaryPricing(mismatched);
  assert.equal(fallback.mode, "standard");
  assert.equal(fallback.showSubtotal, true);
  assert.equal(fallback.showEbookDiscount, true);
  assert.equal(combo.totalCents, 6490);
});
