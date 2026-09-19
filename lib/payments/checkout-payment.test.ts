import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { calculateQuoteFromCatalog, type CommerceCatalogSnapshot } from "@/lib/commerce/quote";
import { checkoutPaySchema } from "@/lib/payments/schemas";
import { getMercadoPagoAccessToken, MercadoPagoNotConfiguredError } from "@/lib/payments/config";
import { decidePaymentAttemptAction } from "@/lib/payments/idempotency";
import { startCheckoutPayment, type CheckoutPaymentDependencies } from "@/lib/payments/start-checkout-payment";
import { handleMercadoPagoWebhook } from "@/lib/payments/handle-webhook";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import { buildWebhookManifest, verifyMercadoPagoSignature } from "@/lib/payments/webhook-signature";
import type { ExistingPaymentAttempt } from "@/lib/payments/idempotency";
import type { MercadoPagoOrder } from "@/lib/payments/types";

function catalog(): CommerceCatalogSnapshot {
  return {
    physical: {
      id: "11111111-1111-1111-1111-111111111111",
      sku: "AVIDA-FISICO",
      title: "A Vida é um Dia",
      type: "physical",
      priceCents: 3990,
      currency: "BRL",
      isActive: true,
    },
    digital: {
      id: "22222222-2222-2222-2222-222222222222",
      sku: "AVIDA-EBOOK",
      title: "A Vida é um Dia — E-book",
      type: "digital",
      priceCents: 1990,
      currency: "BRL",
      isActive: true,
    },
    physicalShippingRates: { 1: 1500, 2: 2000, 3: 2500, 4: 3000 },
    ebookBumpPriceCents: 1000,
    currency: "BRL",
  };
}

const customer = {
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "11999999999",
  document: "52998224725",
};

const shipping = {
  zip: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  district: "Bela Vista",
  city: "São Paulo",
  state: "SP" as const,
};

const attemptId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const attemptId2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function physicalPayload(overrides?: Record<string, unknown>) {
  return {
    kind: "physical" as const,
    quantity: 1,
    ebookBump: true,
    customer,
    shipping,
    paymentAttemptId: attemptId,
    payment: { method: "pix" as const },
    ...overrides,
  };
}

test("payload de pagamento rejeita valores financeiros do client", () => {
  assert.equal(
    checkoutPaySchema.safeParse(
      physicalPayload({ totalCents: 1, subtotalCents: 1, shippingCents: 0, discountCents: 0 }),
    ).success,
    false,
  );
});

test("quantidade física 1–4 é aceita e 5 é rejeitada", () => {
  assert.equal(checkoutPaySchema.safeParse(physicalPayload({ quantity: 1 })).success, true);
  assert.equal(checkoutPaySchema.safeParse(physicalPayload({ quantity: 4, ebookBump: false })).success, true);
  assert.equal(checkoutPaySchema.safeParse(physicalPayload({ quantity: 5 })).success, false);
});

test("bump digital standalone é rejeitado no schema de pagamento", () => {
  assert.equal(
    checkoutPaySchema.safeParse({
      kind: "digital",
      customer,
      ebookBump: true,
      paymentAttemptId: attemptId,
      payment: { method: "pix" },
    }).success,
    false,
  );
});

function mockDeps(options?: {
  existing?: ExistingPaymentAttempt | null;
  mpOrder?: MercadoPagoOrder;
  createCalls?: { count: number };
  mpCalls?: { keys: string[]; amounts: string[] };
}): CheckoutPaymentDependencies {
  const payments = new Map<string, ExistingPaymentAttempt>();
  if (options?.existing) {
    payments.set(options.existing.idempotencyKey, options.existing);
  }
  const createCalls = options?.createCalls ?? { count: 0 };
  const mpCalls = options?.mpCalls ?? { keys: [], amounts: [] };
  const lastOrder: MercadoPagoOrder =
    options?.mpOrder ?? {
      id: "ORDTEST1",
      status: "action_required",
      status_detail: "waiting_transfer",
      transactions: {
        payments: [
          {
            id: "PAYTEST1",
            status: "action_required",
            status_detail: "waiting_transfer",
            payment_method: {
              id: "pix",
              type: "bank_transfer",
              qr_code: "000201pix",
              qr_code_base64: "YQ==",
              ticket_url: "https://example.test/pix",
            },
          },
        ],
      },
    };

  return {
    quote: async (selection) => calculateQuoteFromCatalog(selection, catalog()),
    createOrder: async () => {
      createCalls.count += 1;
      return {
        ok: true,
        publicId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        orderId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      };
    },
    store: {
      findByIdempotencyKey: async (key) => payments.get(key) ?? null,
      insertPayment: async (input) => {
        const row: ExistingPaymentAttempt = {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          orderId: input.orderId,
          publicId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          idempotencyKey: input.idempotencyKey,
          status: "pending",
          providerOrderId: null,
          providerPaymentId: null,
        };
        payments.set(input.idempotencyKey, row);
        return { id: row.id };
      },
      updatePayment: async (input) => {
        for (const row of payments.values()) {
          if (row.id === input.paymentId) {
            row.status = input.status;
            row.providerOrderId = input.providerOrderId;
            row.providerPaymentId = input.providerPaymentId;
          }
        }
      },
      insertEvent: async () => undefined,
    },
    mercadoPago: {
      createOrder: async (input, key) => {
        mpCalls.keys.push(key);
        mpCalls.amounts.push(input.totalAmount);
        return lastOrder;
      },
      getOrder: async () => lastOrder,
    },
  };
}

test("servidor calcula total, frete, bump 1 unidade e desconto 990", async () => {
  const mpCalls = { keys: [] as string[], amounts: [] as string[] };
  const deps = mockDeps({ mpCalls });
  const parsed = checkoutPaySchema.parse(physicalPayload());
  const result = await startCheckoutPayment(parsed, deps);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payment.method, "pix");
    assert.equal(result.payment.status, "pending");
    assert.equal(result.payment.pix?.qrCode, "000201pix");
  }
  assert.equal(mpCalls.amounts[0], "64.90");
  assert.equal(mpCalls.keys[0], attemptId);

  const quote = calculateQuoteFromCatalog(
    { kind: "physical", quantity: 1, ebookBump: true },
    catalog(),
  );
  assert.equal(quote.items.find((item) => item.sku === "AVIDA-EBOOK")?.quantity, 1);
  assert.equal(quote.discountCents, 990);
  assert.equal(quote.shippingCents, 1500);
  assert.equal(quote.totalCents, 6490);
});

test("digital sem frete usa total 19.90 no Mercado Pago", async () => {
  const mpCalls = { keys: [] as string[], amounts: [] as string[] };
  const deps = mockDeps({ mpCalls });
  const parsed = checkoutPaySchema.parse({
    kind: "digital",
    customer,
    paymentAttemptId: attemptId,
    payment: { method: "pix" },
  });
  const result = await startCheckoutPayment(parsed, deps);
  assert.equal(result.ok, true);
  assert.equal(mpCalls.amounts[0], "19.90");
});

test("mesma tentativa reutiliza a idempotency key e não cria outro pedido", async () => {
  const createCalls = { count: 0 };
  const mpCalls = { keys: [] as string[], amounts: [] as string[] };
  const deps = mockDeps({ createCalls, mpCalls });
  const parsed = checkoutPaySchema.parse(physicalPayload({ ebookBump: false }));
  const first = await startCheckoutPayment(parsed, deps);
  const second = await startCheckoutPayment(parsed, deps);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(createCalls.count, 1);
  assert.equal(mpCalls.keys.length, 1);
  assert.deepEqual(mpCalls.keys, [attemptId]);
});

test("nova tentativa após rejeição pode ter nova idempotency key", async () => {
  const createCalls = { count: 0 };
  const deps = mockDeps({
    createCalls,
    existing: {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      orderId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      publicId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      idempotencyKey: attemptId,
      status: "rejected",
      providerOrderId: "ORDOLD",
      providerPaymentId: "PAYOLD",
    },
  });
  deps.mercadoPago.getOrder = async () => ({
    id: "ORDOLD",
    status: "rejected",
    transactions: { payments: [{ id: "PAYOLD", status: "rejected" }] },
  });

  const rejected = await startCheckoutPayment(checkoutPaySchema.parse(physicalPayload()), deps);
  assert.equal(rejected.ok, true);
  if (rejected.ok) {
    assert.equal(rejected.payment.status, "rejected");
  }
  assert.equal(createCalls.count, 0);

  const retry = await startCheckoutPayment(
    checkoutPaySchema.parse(physicalPayload({ paymentAttemptId: attemptId2 })),
    deps,
  );
  assert.equal(retry.ok, true);
  assert.equal(createCalls.count, 1);
});

test("ausência do Access Token falha de forma segura", () => {
  assert.throws(
    () => getMercadoPagoAccessToken({}),
    (error: unknown) => error instanceof MercadoPagoNotConfiguredError,
  );
});

test("webhook sem secret não processa", async () => {
  const request = new Request("https://www.robsonsantiago.com.br/api/webhooks/mercado-pago", {
    method: "POST",
    body: JSON.stringify({ data: { id: "ORD01ABC" } }),
  });
  const result = await handleMercadoPagoWebhook(request, {});
  assert.equal(result.ok, false);
  assert.equal(result.code, "WEBHOOK_NOT_CONFIGURED");
  assert.equal(result.status, 503);
});

test("webhook com assinatura inválida não processa", async () => {
  const env = { MERCADO_PAGO_WEBHOOK_SECRET: "test-secret" };
  const request = new Request(
    "https://www.robsonsantiago.com.br/api/webhooks/mercado-pago?data.id=ORD01ABC",
    {
      method: "POST",
      headers: {
        "x-signature": "ts=123,v1=deadbeef",
        "x-request-id": "req-1",
      },
      body: JSON.stringify({ data: { id: "ORD01ABC" } }),
    },
  );
  const result = await handleMercadoPagoWebhook(request, env);
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_SIGNATURE");
  assert.equal(result.status, 401);
});

test("assinatura HMAC válida é reconhecida, mas reconciliação permanece desligada", async () => {
  const secret = "test-secret";
  const dataId = "ORD01ABC";
  const requestId = "req-1";
  const ts = "1704908010";
  const manifest = buildWebhookManifest({ dataId, requestId, ts });
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  assert.equal(
    verifyMercadoPagoSignature({
      secret,
      signatureHeader: `ts=${ts},v1=${v1}`,
      requestId,
      dataId,
    }),
    true,
  );

  const request = new Request(
    `https://www.robsonsantiago.com.br/api/webhooks/mercado-pago?data.id=${dataId}`,
    {
      method: "POST",
      headers: {
        "x-signature": `ts=${ts},v1=${v1}`,
        "x-request-id": requestId,
      },
      body: JSON.stringify({ type: "order", data: { id: dataId } }),
    },
  );
  const result = await handleMercadoPagoWebhook(request, { MERCADO_PAGO_WEBHOOK_SECRET: secret });
  assert.equal(result.ok, false);
  assert.equal(result.code, "WEBHOOK_PROCESSING_DISABLED");
});

test("API pública de pagamento não devolve dados sensíveis", async () => {
  const deps = mockDeps({
    mpOrder: {
      id: "ORDTEST1",
      status: "processed",
      transactions: {
        payments: [
          {
            id: "PAYTEST1",
            status: "processed",
            payment_method: { id: "master", type: "credit_card" },
          },
        ],
      },
    },
  });
  const parsed = checkoutPaySchema.parse(
    physicalPayload({
      ebookBump: false,
      payment: {
        method: "credit_card",
        token: "card-token-secret",
        paymentMethodId: "master",
        installments: 1,
      },
    }),
  );
  const result = await startCheckoutPayment(parsed, deps);
  assert.equal(result.ok, true);
  assert.doesNotThrow(() => assertNoSensitiveFields(result));
  assert.equal(JSON.stringify(result).includes("card-token-secret"), false);
  assert.equal(JSON.stringify(result).includes(customer.document), false);
  assert.equal(JSON.stringify(result).includes(customer.email), false);
});

test("decidePaymentAttemptAction reutiliza chave da mesma tentativa", () => {
  const pending: ExistingPaymentAttempt = {
    id: "p1",
    orderId: "o1",
    publicId: "pub1",
    idempotencyKey: attemptId,
    status: "pending",
    providerOrderId: null,
    providerPaymentId: null,
  };
  assert.equal(decidePaymentAttemptAction(null).action, "create");
  assert.equal(decidePaymentAttemptAction(pending).action, "retry_provider");
  assert.equal(
    decidePaymentAttemptAction({ ...pending, providerOrderId: "ORD1" }).action,
    "reuse_result",
  );
});
