import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  canAdvanceToPayment,
  canAlterCheckoutOrder,
  canEditCheckoutSelection,
  displayedCheckoutOrder,
  isCheckoutOrderFrozen,
  shouldMountPaymentSection,
} from "@/lib/commerce/checkout-flow";
import { checkoutReviewFromFields } from "@/lib/commerce/checkout-review";

const quote = { totalCents: 5490 };

test("details não monta pagamento e payment monta", () => {
  assert.equal(shouldMountPaymentSection("details"), false);
  assert.equal(shouldMountPaymentSection("payment"), true);
});

test("formulário inválido não avança e formulário válido com quote pronta avança", () => {
  assert.equal(
    canAdvanceToPayment({
      quoting: false,
      amountCents: 5490,
      errors: { customer_email: "Informe um e-mail válido." },
    }),
    false,
  );
  assert.equal(
    canAdvanceToPayment({
      quoting: false,
      amountCents: 5490,
      errors: {},
    }),
    true,
  );
});

test("quoting impede avanço mesmo com campos válidos", () => {
  assert.equal(
    canAdvanceToPayment({
      quoting: true,
      amountCents: 5490,
      errors: {},
    }),
    false,
  );
  assert.equal(
    canAdvanceToPayment({
      quoting: false,
      amountCents: null,
      errors: {},
    }),
    false,
  );
});

test("voltar só existe na etapa de pagamento antes de uma cobrança", () => {
  assert.equal(
    canAlterCheckoutOrder({ step: "payment", hasPayment: false, uiState: "ready" }),
    true,
  );
  assert.equal(
    canAlterCheckoutOrder({ step: "details", hasPayment: false, uiState: "ready" }),
    false,
  );
  assert.equal(
    canAlterCheckoutOrder({ step: "payment", hasPayment: true, uiState: "ready" }),
    false,
  );
  assert.equal(
    canAlterCheckoutOrder({ step: "payment", hasPayment: false, uiState: "processing" }),
    false,
  );
});

test("payment e pedido congelado não editam quantidade nem bump", () => {
  assert.equal(canEditCheckoutSelection({ step: "payment", frozen: false }), false);
  assert.equal(canEditCheckoutSelection({ step: "details", frozen: false }), true);
  assert.equal(canEditCheckoutSelection({ step: "details", frozen: true }), false);
});

test("awaiting_pix, approved e refunded congelam o pedido e escondem alterar dados", () => {
  for (const uiState of ["awaiting_pix", "approved", "refunded"] as const) {
    assert.equal(isCheckoutOrderFrozen(uiState), true);
    assert.equal(
      canAlterCheckoutOrder({ step: "payment", hasPayment: true, uiState }),
      false,
    );
    assert.equal(
      canEditCheckoutSelection({ step: "payment", frozen: isCheckoutOrderFrozen(uiState) }),
      false,
    );
  }
  assert.equal(isCheckoutOrderFrozen("ready"), false);
  assert.equal(isCheckoutOrderFrozen("rejected"), false);
});

test("resumo congelado ignora quantidade e bump posteriores", () => {
  const frozen = displayedCheckoutOrder(
    { quote: { totalCents: 9900 }, quantity: 4, ebookBump: true },
    { quote, quantity: 1, ebookBump: false },
  );

  assert.deepEqual(frozen, { quote, quantity: 1, ebookBump: false });
  assert.equal(
    displayedCheckoutOrder({ quote, quantity: 2, ebookBump: true }, null).quantity,
    2,
  );
});

test("snapshot de revisão copia os dados e omite endereço no e-book", () => {
  const fields = {
    customer: {
      name: "Ana Souza",
      email: "ana@example.com",
      phone: "abc",
      document: "11111111111",
    },
    shipping: {
      zip: "01310-100",
      street: "Av. Paulista",
      number: "1000",
      complement: "ap 2",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    },
  };

  const physical = checkoutReviewFromFields("physical", fields);
  fields.customer.name = "Outra pessoa";
  fields.shipping.street = "Outra rua";

  assert.equal(physical.customer.name, "Ana Souza");
  assert.equal(physical.shipping?.street, "Av. Paulista");
  assert.equal(physical.shipping?.complement, "ap 2");
  assert.equal(checkoutReviewFromFields("digital", fields).shipping, null);
});

test("o checkout liga as etapas sem segundo Brick e sem girar a tentativa ao voltar", () => {
  const form = readFileSync(join(process.cwd(), "components/checkout/CheckoutForm.tsx"), "utf8");
  const section = readFileSync(join(process.cwd(), "components/checkout/PaymentSection.tsx"), "utf8");
  const back = form.match(/function handleBackToDetails\(\) \{[\s\S]*?\n  \}/);

  assert.ok(back);
  assert.equal(back[0].includes("newPaymentAttemptId"), false);
  assert.match(back[0], /setStep\("details"\)/);
  assert.match(form, /hidden=\{step === "payment"\}/);
  assert.match(form, /shouldMountPaymentSection\(step\)/);
  assert.equal((form.match(/<PaymentSection/g) ?? []).length, 1);
  assert.equal(form.includes("MercadoPagoPaymentBrick"), false);
  assert.equal((section.match(/<MercadoPagoPaymentBrick/g) ?? []).length, 1);
  assert.match(form, /quantityEditable=\{selectionEditable\}/);
  assert.match(form, /onEbookBumpChange=\{selectionEditable \? setEbookBump : undefined\}/);
  assert.match(form, /quote=\{displayed\.quote\}/);
  assert.match(form, /quantity=\{displayed\.quantity\}/);
  assert.match(form, /ebookBump=\{displayed\.ebookBump\}/);
  assert.match(form, /setFrozenOrder\(\(current\) => current \?\? snapshot\)/);
  assert.match(form, /Continuar para pagamento/);
  assert.match(form, /Alterar dados ou pedido/);
});
