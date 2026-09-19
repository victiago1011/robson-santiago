import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateQuoteFromCatalog, type CommerceCatalogSnapshot } from "./quote";
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
    physicalShippingCents: 1500,
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

test("físico 1 sem bump total 5490", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: false },
    catalog(),
  );
  assert.equal(quote.items.length, 1);
  assert.equal(quote.subtotalCents, 3990);
  assert.equal(quote.discountCents, 0);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 5490);
  assert.equal(quote.promotionCode, null);
  assert.equal(quote.ebookBump, false);
  assert.equal(quote.purchasable, false);
});

test("físico 1 com bump total 6490", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: true },
    catalog(),
  );
  assert.equal(quote.items.length, 2);
  assert.equal(quote.items[0]?.sku, "AVIDA-FISICO");
  assert.equal(quote.items[0]?.quantity, 1);
  assert.equal(quote.items[0]?.unitPriceCents, 3990);
  assert.equal(quote.items[1]?.sku, "AVIDA-EBOOK");
  assert.equal(quote.items[1]?.quantity, 1);
  assert.equal(quote.items[1]?.unitPriceCents, 1990);
  assert.equal(quote.subtotalCents, 5980);
  assert.equal(quote.discountCents, 990);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 6490);
  assert.equal(quote.promotionCode, "AVIDA-EBOOK-BUMP");
});

test("físico 5 sem bump", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 5, ebookBump: false },
    catalog(),
  );
  assert.equal(quote.subtotalCents, 19950);
  assert.equal(quote.discountCents, 0);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 21450);
});

test("físico 5 com bump adiciona exatamente 1 e-book", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 5, ebookBump: true },
    catalog(),
  );
  const ebook = quote.items.find((item) => item.sku === "AVIDA-EBOOK");
  assert.equal(ebook?.quantity, 1);
  assert.equal(quote.items.filter((item) => item.sku === "AVIDA-EBOOK").length, 1);
  assert.equal(quote.subtotalCents, 21940);
  assert.equal(quote.discountCents, 990);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 22450);
});

test("físico 2 com bump não multiplica e-book nem desconto", () => {
  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 2, ebookBump: true },
    catalog(),
  );
  assert.equal(quote.items.find((item) => item.sku === "AVIDA-EBOOK")?.quantity, 1);
  assert.equal(quote.subtotalCents, 9970);
  assert.equal(quote.discountCents, 990);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 10480);
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

test("rejeita quantidade 6", () => {
  assert.equal(
    purchaseSelectionSchema.safeParse({ kind: "physical", quantity: 6, ebookBump: false }).success,
    false,
  );
  assert.throws(() =>
    calculateQuoteFromCatalog({ kind: "physical", quantity: 6, ebookBump: false }, catalog()),
  );
});

test("digital total 1990 sem frete", () => {
  const quote = calculateQuoteFromCatalog({ kind: "digital" }, catalog());
  assert.equal(quote.subtotalCents, 1990);
  assert.equal(quote.discountCents, 0);
  assert.equal(quote.shippingCents, 0);
  assert.equal(quote.totalCents, 1990);
  assert.equal(quote.requiresShipping, false);
  assert.equal(quote.promotionCode, null);
});

test("digital não aceita ebookBump", () => {
  assert.equal(
    purchaseSelectionSchema.safeParse({ kind: "digital", ebookBump: true }).success,
    false,
  );
  assert.equal(
    createOrderSchema.safeParse({
      kind: "digital",
      customer,
      ebookBump: true,
    }).success,
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
  assert.equal(
    createOrderSchema.safeParse({
      kind: "digital",
      customer,
      shipping,
    }).success,
    false,
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

test("combo não é seleção válida", () => {
  assert.equal(purchaseSelectionSchema.safeParse({ kind: "combo" }).success, false);
});
