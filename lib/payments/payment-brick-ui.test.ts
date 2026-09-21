import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  CHECKOUT_TEST_COPY_PATTERNS,
  createPaymentBrickInitialization,
  PAYMENT_BRICK_CUSTOMIZATION,
  paymentBrickInstanceKey,
} from "@/lib/payments/payment-brick-ui";

const CHECKOUT_UI_DIR = join(process.cwd(), "components", "checkout");

function checkoutUiSources(): string[] {
  return readdirSync(CHECKOUT_UI_DIR)
    .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
    .map((name) => readFileSync(join(CHECKOUT_UI_DIR, name), "utf8"));
}

test("customization do Brick é um singleton estável entre renders", () => {
  assert.equal(PAYMENT_BRICK_CUSTOMIZATION, PAYMENT_BRICK_CUSTOMIZATION);
  assert.equal(PAYMENT_BRICK_CUSTOMIZATION.paymentMethods.maxInstallments, 12);
  assert.deepEqual(PAYMENT_BRICK_CUSTOMIZATION.paymentMethods.bankTransfer, ["pix"]);
});

test("initialization do Brick contém só o amount, nunca dados do comprador", () => {
  const initialization = createPaymentBrickInitialization(1990);
  assert.deepEqual(initialization, { amount: 19.9 });
  assert.equal("payer" in initialization, false);
  assert.equal("email" in initialization, false);
});

test("mudança de e-mail ou CPF não gera outra instância do Brick", () => {
  const before = paymentBrickInstanceKey({
    amountCents: 1990,
    payerEmail: "antes@example.com",
    payerDocument: "11111111111",
  });
  const after = paymentBrickInstanceKey({
    amountCents: 1990,
    payerEmail: "depois@example.com",
    payerDocument: "52998224725",
  });
  assert.equal(before, after);
});

test("só o amount do pedido remonta o Brick", () => {
  const ebook = paymentBrickInstanceKey({ amountCents: 1990 });
  const physical = paymentBrickInstanceKey({ amountCents: 5490 });
  assert.notEqual(ebook, physical);
});

test("o checkout monta uma única chave de Brick para o mesmo total", () => {
  const keys = [1990, 1990, 1990].map((amountCents) => paymentBrickInstanceKey({ amountCents }));
  assert.equal(new Set(keys).size, 1);
});

test("UI de checkout não contém copy de ambiente de teste", () => {
  const sources = checkoutUiSources();
  assert.ok(sources.length > 0);

  for (const source of sources) {
    for (const pattern of CHECKOUT_TEST_COPY_PATTERNS) {
      assert.equal(
        pattern.test(source),
        false,
        `copy de teste encontrada: ${pattern}`,
      );
    }
  }
});

test("Payment Brick não recebe e-mail nem CPF do formulário", () => {
  const brick = readFileSync(join(CHECKOUT_UI_DIR, "MercadoPagoPaymentBrick.tsx"), "utf8");
  const form = readFileSync(join(CHECKOUT_UI_DIR, "CheckoutForm.tsx"), "utf8");
  const section = readFileSync(join(CHECKOUT_UI_DIR, "PaymentSection.tsx"), "utf8");

  assert.equal(brick.includes("payerEmail"), false);
  assert.equal(brick.includes("payerDocument"), false);
  assert.equal(brick.includes("payer:"), false);
  assert.equal(form.includes("payerEmail"), false);
  assert.equal(section.includes("payerEmail"), false);
  assert.equal(section.includes("MercadoPagoPaymentBrick"), true);
  assert.equal((section.match(/<MercadoPagoPaymentBrick/g) ?? []).length, 1);
});
