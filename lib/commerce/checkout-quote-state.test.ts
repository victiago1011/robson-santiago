import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  checkoutIsQuoting,
  checkoutNeedsRemoteQuote,
  checkoutPaymentAmountCents,
  checkoutQuoteSelection,
  readCheckoutQuoteResponse,
  remoteQuoteMatchesSelection,
  selectCheckoutQuote,
} from "@/lib/commerce/checkout-quote-state";
import type { PublicQuote } from "@/lib/commerce/quote";

function quoteWithTotal(totalCents: number): PublicQuote {
  return {
    items: [
      {
        sku: "TEST",
        title: "Item",
        type: "digital",
        quantity: 1,
        unitPriceCents: totalCents,
        lineTotalCents: totalCents,
      },
    ],
    subtotalCents: totalCents,
    discountCents: 0,
    shippingCents: 0,
    totalCents,
    currency: "BRL",
    promotionCode: null,
    ebookBump: false,
    ebookListPriceCents: null,
    ebookBumpPriceCents: null,
    shippingMethod: null,
    requiresShipping: false,
    purchasable: true,
  };
}

test("A) digital sem initialQuote pede POST só com kind digital", () => {
  assert.equal(
    checkoutNeedsRemoteQuote({
      kind: "digital",
      quantity: 1,
      ebookBump: false,
      initialQuote: null,
    }),
    true,
  );
  assert.deepEqual(checkoutQuoteSelection("digital", 1, true), { kind: "digital" });
  assert.equal("ebookBump" in checkoutQuoteSelection("digital", 2, true), false);
  assert.equal("quantity" in checkoutQuoteSelection("digital", 2, true), false);
});

test("B) digital com initialQuote válida não faz fallback", () => {
  const initialQuote = quoteWithTotal(1234);
  assert.equal(
    checkoutNeedsRemoteQuote({
      kind: "digital",
      quantity: 1,
      ebookBump: false,
      initialQuote,
    }),
    false,
  );
  assert.equal(
    selectCheckoutQuote({
      kind: "digital",
      quantity: 1,
      ebookBump: false,
      initialQuote,
      remote: null,
    }),
    initialQuote,
  );
  assert.equal(
    checkoutIsQuoting({
      kind: "digital",
      quantity: 1,
      ebookBump: false,
      initialQuote,
      remote: null,
    }),
    false,
  );
});

test("C) digital com initialQuote null usa remote quote e libera amountCents", () => {
  const remoteQuote = quoteWithTotal(1234);
  const selected = selectCheckoutQuote({
    kind: "digital",
    quantity: 1,
    ebookBump: false,
    initialQuote: null,
    remote: { selection: { kind: "digital" }, quote: remoteQuote },
  });
  assert.equal(selected, remoteQuote);
  assert.equal(checkoutPaymentAmountCents(selected), 1234);
  assert.equal(
    checkoutIsQuoting({
      kind: "digital",
      quantity: 1,
      ebookBump: false,
      initialQuote: null,
      remote: { selection: { kind: "digital" }, quote: remoteQuote },
    }),
    false,
  );
});

test("D) falha da API não inventa preço nem amount de pagamento", () => {
  assert.equal(readCheckoutQuoteResponse({ ok: false, code: "CATALOG_UNAVAILABLE" }), null);
  assert.equal(readCheckoutQuoteResponse({ ok: true }), null);
  assert.equal(readCheckoutQuoteResponse({ ok: true, quote: { totalCents: 0 } }), null);
  assert.equal(readCheckoutQuoteResponse(null), null);

  const selected = selectCheckoutQuote({
    kind: "digital",
    quantity: 1,
    ebookBump: false,
    initialQuote: null,
    remote: null,
  });
  assert.equal(selected, null);
  assert.equal(checkoutPaymentAmountCents(selected), null);
  assert.equal(checkoutPaymentAmountCents(quoteWithTotal(0)), null);
});

test("E) físico default com initialQuote não recota", () => {
  const initialQuote = quoteWithTotal(4321);
  assert.equal(
    checkoutNeedsRemoteQuote({
      kind: "physical",
      quantity: 1,
      ebookBump: false,
      initialQuote,
    }),
    false,
  );
  assert.equal(
    selectCheckoutQuote({
      kind: "physical",
      quantity: 1,
      ebookBump: false,
      initialQuote,
      remote: null,
    }),
    initialQuote,
  );
});

test("E) físico default sem initialQuote pede cotação física padrão", () => {
  assert.equal(
    checkoutNeedsRemoteQuote({
      kind: "physical",
      quantity: 1,
      ebookBump: false,
      initialQuote: null,
    }),
    true,
  );
  assert.deepEqual(checkoutQuoteSelection("physical", 1, false), {
    kind: "physical",
    quantity: 1,
    ebookBump: false,
  });
});

test("F) mudança de quantidade ou bump do físico recota e só usa remote quando bate a seleção", () => {
  const initialQuote = quoteWithTotal(4321);
  const remoteQuote = quoteWithTotal(8765);

  assert.equal(
    checkoutNeedsRemoteQuote({
      kind: "physical",
      quantity: 2,
      ebookBump: false,
      initialQuote,
    }),
    true,
  );
  assert.equal(
    checkoutNeedsRemoteQuote({
      kind: "physical",
      quantity: 1,
      ebookBump: true,
      initialQuote,
    }),
    true,
  );
  assert.deepEqual(checkoutQuoteSelection("physical", 2, true), {
    kind: "physical",
    quantity: 2,
    ebookBump: true,
  });

  assert.equal(
    remoteQuoteMatchesSelection(
      { selection: { kind: "physical", quantity: 1, ebookBump: false }, quote: remoteQuote },
      "physical",
      2,
      false,
    ),
    false,
  );
  assert.equal(
    selectCheckoutQuote({
      kind: "physical",
      quantity: 2,
      ebookBump: false,
      initialQuote,
      remote: { selection: { kind: "physical", quantity: 1, ebookBump: false }, quote: remoteQuote },
    }),
    initialQuote,
  );
  assert.equal(
    selectCheckoutQuote({
      kind: "physical",
      quantity: 2,
      ebookBump: false,
      initialQuote,
      remote: { selection: { kind: "physical", quantity: 2, ebookBump: false }, quote: remoteQuote },
    }),
    remoteQuote,
  );
  assert.equal(
    checkoutIsQuoting({
      kind: "physical",
      quantity: 2,
      ebookBump: false,
      initialQuote,
      remote: null,
    }),
    true,
  );
});

test("CheckoutForm usa o helper e não manda ebookBump no digital", () => {
  const form = readFileSync(join(process.cwd(), "components", "checkout", "CheckoutForm.tsx"), "utf8");
  assert.equal(form.includes("checkoutNeedsRemoteQuote"), true);
  assert.equal(form.includes("checkoutQuoteSelection"), true);
  assert.equal(form.includes("selectCheckoutQuote"), true);
  assert.equal(form.includes("readCheckoutQuoteResponse"), true);
  assert.equal(form.includes("JSON.stringify({ kind: \"physical\", quantity, ebookBump })"), false);
});
