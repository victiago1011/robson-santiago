import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { decimalAmountToCents } from "@/lib/payments/amount";
import { handleMercadoPagoWebhook } from "@/lib/payments/handle-webhook";
import {
  checkFinancialMatch,
  decideReconciliation,
  selectPaymentAttempt,
  type WebhookOrderRecord,
  type WebhookPaymentRecord,
  type WebhookPaymentStore,
} from "@/lib/payments/reconcile-order";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import {
  canTransitionOrderPaymentStatus,
  mapProviderStatus,
} from "@/lib/payments/status";
import type { MercadoPagoOrder } from "@/lib/payments/types";
import {
  buildWebhookManifest,
  extractWebhookDataId,
  isWebhookTimestampFresh,
  verifyMercadoPagoSignature,
  WEBHOOK_SIGNATURE_MAX_AGE_MS,
} from "@/lib/payments/webhook-signature";

const SECRET = "test-webhook-secret";
const PUBLIC_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ORDER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const PAYMENT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PROVIDER_ORDER_ID = "ORD01ABC";
const NOW = 1_800_000_000_000;

function sign(dataId: string, requestId: string, ts: string) {
  const manifest = buildWebhookManifest({ dataId, requestId, ts });
  return createHmac("sha256", SECRET).update(manifest).digest("hex");
}

function signedRequest(options?: {
  dataId?: string | number;
  requestId?: string | null;
  ts?: string;
  signature?: string;
  query?: boolean;
}) {
  const dataId = options?.dataId ?? PROVIDER_ORDER_ID;
  const dataIdText = String(dataId);
  const requestId = options?.requestId === null ? null : (options?.requestId ?? "req-1");
  const ts = options?.ts ?? String(Math.floor(NOW / 1000));
  const v1 = options?.signature ?? sign(dataIdText, requestId ?? "", ts);
  const url = options?.query === false
    ? "https://www.robsonsantiago.com.br/api/webhooks/mercado-pago"
    : `https://www.robsonsantiago.com.br/api/webhooks/mercado-pago?data.id=${encodeURIComponent(dataIdText)}`;
  const headers: Record<string, string> = {
    "x-signature": `ts=${ts},v1=${v1}`,
  };
  if (requestId) {
    headers["x-request-id"] = requestId;
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "order", data: { id: dataId } }),
  });
}

function localOrder(overrides?: Partial<WebhookOrderRecord>): WebhookOrderRecord {
  return {
    id: ORDER_ID,
    publicId: PUBLIC_ID,
    totalCents: 6490,
    currency: "BRL",
    paymentStatus: "pending",
    fulfillmentStatus: "pending",
    ...overrides,
  };
}

function localPayment(overrides?: Partial<WebhookPaymentRecord>): WebhookPaymentRecord {
  return {
    id: PAYMENT_ID,
    orderId: ORDER_ID,
    provider: "mercado_pago",
    providerOrderId: PROVIDER_ORDER_ID,
    providerPaymentId: "PAY01ABC",
    status: "pending",
    ...overrides,
  };
}

function mpOrder(overrides?: Partial<MercadoPagoOrder>): MercadoPagoOrder {
  return {
    id: PROVIDER_ORDER_ID,
    status: "processed",
    status_detail: "accredited",
    external_reference: PUBLIC_ID,
    total_amount: "64.90",
    total_paid_amount: "64.90",
    currency: "BRL",
    transactions: {
      payments: [
        {
          id: "PAY01ABC",
          status: "processed",
          status_detail: "accredited",
          amount: "64.90",
          paid_amount: "64.90",
        },
      ],
    },
    ...overrides,
  };
}

function mockStore(seed?: {
  order?: WebhookOrderRecord | null;
  payments?: WebhookPaymentRecord[];
}) {
  const order = seed?.order === undefined ? localOrder() : seed.order;
  const payments = seed?.payments ? [...seed.payments] : [localPayment()];
  const events: { orderId: string; type: string; metadata: Record<string, unknown> }[] = [];
  const fulfillmentSnapshots: string[] = [];

  const store: WebhookPaymentStore = {
    findOrderByPublicId: async (publicId) => {
      if (!order || order.publicId !== publicId) {
        return null;
      }
      return order;
    },
    listPaymentsForOrder: async (orderId) => payments.filter((row) => row.orderId === orderId),
    updatePayment: async (input) => {
      const row = payments.find((item) => item.id === input.paymentId);
      if (!row) {
        return;
      }
      row.providerOrderId = input.providerOrderId;
      row.providerPaymentId = input.providerPaymentId;
      row.status = input.status;
    },
    updateOrderPaymentStatus: async (_orderId, paymentStatus) => {
      if (!order) {
        return;
      }
      fulfillmentSnapshots.push(order.fulfillmentStatus);
      order.paymentStatus = paymentStatus;
    },
    insertEvent: async (orderId, eventType, metadata) => {
      assert.doesNotThrow(() => assertNoSensitiveFields(metadata));
      events.push({ orderId, type: eventType, metadata });
    },
  };

  return { store, get order() { return order; }, payments, events, fulfillmentSnapshots };
}

async function handle(
  request: Request,
  getOrder: () => Promise<MercadoPagoOrder>,
  store: WebhookPaymentStore,
  getCalls: { count: number },
) {
  return handleMercadoPagoWebhook(
    request,
    { MERCADO_PAGO_WEBHOOK_SECRET: SECRET },
    {
      now: () => NOW,
      getMercadoPago: () => ({
        createOrder: async () => {
          throw new Error("createOrder should not run");
        },
        getOrder: async () => {
          getCalls.count += 1;
          return getOrder();
        },
      }),
      store,
    },
  );
}

test("decimalAmountToCents não usa float", () => {
  assert.equal(decimalAmountToCents("64.90"), 6490);
  assert.equal(decimalAmountToCents("50.00"), 5000);
  assert.equal(decimalAmountToCents("10.9"), 1090);
  assert.equal(decimalAmountToCents("64.901"), null);
});

test("secret ausente não processa", async () => {
  const result = await handleMercadoPagoWebhook(signedRequest(), {});
  assert.equal(result.code, "WEBHOOK_NOT_CONFIGURED");
  assert.equal(result.status, 503);
});

test("assinatura ausente não processa", async () => {
  const request = new Request(
    `https://www.robsonsantiago.com.br/api/webhooks/mercado-pago?data.id=${PROVIDER_ORDER_ID}`,
    {
      method: "POST",
      headers: { "x-request-id": "req-1" },
      body: JSON.stringify({ data: { id: PROVIDER_ORDER_ID } }),
    },
  );
  const getCalls = { count: 0 };
  const { store } = mockStore();
  const result = await handle(request, async () => mpOrder(), store, getCalls);
  assert.equal(result.code, "INVALID_SIGNATURE");
  assert.equal(result.status, 401);
  assert.equal(getCalls.count, 0);
});

test("assinatura inválida não chama Mercado Pago", async () => {
  const getCalls = { count: 0 };
  const { store, events } = mockStore();
  const result = await handle(
    signedRequest({ signature: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" }),
    async () => mpOrder(),
    store,
    getCalls,
  );
  assert.equal(result.code, "INVALID_SIGNATURE");
  assert.equal(getCalls.count, 0);
  assert.equal(events.length, 0);
});

test("HMAC válido e timestamp dentro da tolerância", () => {
  const ts = String(Math.floor(NOW / 1000));
  assert.equal(
    verifyMercadoPagoSignature({
      secret: SECRET,
      signatureHeader: `ts=${ts},v1=${sign(PROVIDER_ORDER_ID, "req-1", ts)}`,
      requestId: "req-1",
      dataId: PROVIDER_ORDER_ID,
    }),
    true,
  );
  assert.equal(isWebhookTimestampFresh(ts, NOW), true);
});

test("timestamp expirado é rejeitado como replay", async () => {
  const oldTs = String(Math.floor((NOW - WEBHOOK_SIGNATURE_MAX_AGE_MS - 1000) / 1000));
  const getCalls = { count: 0 };
  const { store, events } = mockStore();
  const result = await handle(
    signedRequest({ ts: oldTs }),
    async () => mpOrder(),
    store,
    getCalls,
  );
  assert.equal(result.code, "EXPIRED_SIGNATURE");
  assert.equal(result.status, 401);
  assert.equal(getCalls.count, 0);
  assert.equal(events.length, 0);
});

test("timestamp em milissegundos dentro da tolerância é aceito", () => {
  assert.equal(isWebhookTimestampFresh(String(NOW + 30_000), NOW), true);
});

test("assinatura válida chama GET Order", async () => {
  const getCalls = { count: 0 };
  const { store } = mockStore();
  const result = await handle(signedRequest(), async () => mpOrder(), store, getCalls);
  assert.equal(result.code, "RECONCILED");
  assert.equal(result.status, 200);
  assert.equal(getCalls.count, 1);
});

test("data.id numérico da simulação é extraído", () => {
  assert.equal(
    extractWebhookDataId({
      searchParams: new URLSearchParams(),
      body: { data: { id: 123456 } },
    }),
    "123456",
  );
});

test("Order fictícia 404 não corrompe o banco", async () => {
  const getCalls = { count: 0 };
  const { store, events, order } = mockStore();
  const error = Object.assign(new Error("not found"), { status: 404 });
  const result = await handleMercadoPagoWebhook(
    signedRequest({ dataId: "123456" }),
    { MERCADO_PAGO_WEBHOOK_SECRET: SECRET },
    {
      now: () => NOW,
      getMercadoPago: () => ({
        createOrder: async () => {
          throw new Error("unused");
        },
        getOrder: async () => {
          getCalls.count += 1;
          throw error;
        },
      }),
      store,
    },
  );
  assert.equal(result.code, "PROVIDER_ORDER_NOT_FOUND");
  assert.equal(result.status, 200);
  assert.equal(getCalls.count, 1);
  assert.equal(events.length, 0);
  assert.equal(order?.paymentStatus, "pending");
  assert.equal(order?.fulfillmentStatus, "pending");
});

test("external_reference inexistente não cria pedido", async () => {
  const { store, events } = mockStore({ order: null, payments: [] });
  const result = await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  assert.equal(result.code, "PAYMENT_ORDER_NOT_FOUND");
  assert.equal(events.length, 0);
});

test("pedido correto é localizado e aprovado", async () => {
  const { store, order, payments, events, fulfillmentSnapshots } = mockStore({
    payments: [localPayment({ providerOrderId: null })],
  });
  const result = await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  assert.equal(result.code, "RECONCILED");
  assert.equal(order?.paymentStatus, "approved");
  assert.equal(order?.fulfillmentStatus, "pending");
  assert.equal(payments[0].providerOrderId, PROVIDER_ORDER_ID);
  assert.equal(payments[0].status, "approved");
  assert.deepEqual(
    fulfillmentSnapshots,
    fulfillmentSnapshots.map(() => "pending"),
  );
  assert.equal(
    events.some((event) => event.type === "payment_reconciled"),
    true,
  );
  for (const event of events) {
    assert.equal("email" in event.metadata, false);
    assert.equal("cpf" in event.metadata, false);
    assert.doesNotThrow(() => assertNoSensitiveFields(event.metadata));
  }
});

test("provider_order_id incompatível não aprova", async () => {
  const { store, order, events } = mockStore({
    payments: [localPayment({ providerOrderId: "ORD-OTHER" })],
  });
  const result = await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  assert.equal(result.code, "PROVIDER_ORDER_MISMATCH");
  assert.equal(order?.paymentStatus, "pending");
  assert.equal(events.some((event) => event.type === "payment_reconciliation_failed"), true);
});

test("tentativa ambígua não aprova", async () => {
  const { store, order } = mockStore({
    payments: [
      localPayment({ id: "p1", providerOrderId: null }),
      localPayment({ id: "p2", providerOrderId: null }),
    ],
  });
  const result = await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  assert.equal(result.code, "PAYMENT_ATTEMPT_AMBIGUOUS");
  assert.equal(order?.paymentStatus, "pending");
});

test("valor igual pode reconciliar", () => {
  const financial = checkFinancialMatch(mpOrder(), localOrder());
  assert.equal(financial.ok, true);
});

test("valor divergente nunca aprova", async () => {
  const { store, order, events } = mockStore();
  const result = await handle(
    signedRequest(),
    async () => mpOrder({ total_amount: "10.00", total_paid_amount: "10.00" }),
    store,
    { count: 0 },
  );
  assert.equal(result.code, "PAYMENT_AMOUNT_MISMATCH");
  assert.equal(order?.paymentStatus, "pending");
  assert.equal(events.some((event) => event.type === "payment_amount_mismatch"), true);
});

test("moeda diferente de BRL nunca aprova", async () => {
  const { store, order } = mockStore();
  const result = await handle(
    signedRequest(),
    async () => mpOrder({ currency: "ARS" }),
    store,
    { count: 0 },
  );
  assert.equal(result.code, "PAYMENT_CURRENCY_MISMATCH");
  assert.equal(order?.paymentStatus, "pending");
});

test("pending pode ir para approved", () => {
  assert.equal(canTransitionOrderPaymentStatus("pending", "approved"), true);
});

test("approved não volta para pending", async () => {
  const { store, order } = mockStore({
    order: localOrder({ paymentStatus: "approved" }),
    payments: [localPayment({ status: "approved" })],
  });
  const result = await handle(
    signedRequest(),
    async () =>
      mpOrder({
        status: "action_required",
        transactions: { payments: [{ id: "PAY01ABC", status: "action_required" }] },
      }),
    store,
    { count: 0 },
  );
  assert.equal(result.code, "RECONCILED");
  assert.equal(order?.paymentStatus, "approved");
});

test("approved pode ir para refunded", async () => {
  const { store, order, payments } = mockStore({
    order: localOrder({ paymentStatus: "approved" }),
    payments: [localPayment({ status: "approved" })],
  });
  const result = await handle(
    signedRequest(),
    async () =>
      mpOrder({
        status: "refunded",
        transactions: { payments: [{ id: "PAY01ABC", status: "refunded", status_detail: "refunded" }] },
      }),
    store,
    { count: 0 },
  );
  assert.equal(result.code, "RECONCILED");
  assert.equal(order?.paymentStatus, "refunded");
  assert.equal(payments[0].status, "refunded");
  assert.equal(order?.fulfillmentStatus, "pending");
});

test("duplicata mantém resultado e não regrava efeitos", async () => {
  const { store, events } = mockStore({
    order: localOrder({ paymentStatus: "approved" }),
    payments: [localPayment({ status: "approved" })],
  });
  const first = await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  const eventCount = events.length;
  const second = await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  assert.equal(first.code, "RECONCILED");
  assert.equal(second.code, "RECONCILED");
  assert.equal(events.length, eventCount);
});

test("status desconhecido não aprova", async () => {
  const { store, order } = mockStore();
  const result = await handle(
    signedRequest(),
    async () =>
      mpOrder({
        status: "totally_unknown",
        transactions: { payments: [{ id: "PAY01ABC", status: "totally_unknown" }] },
      }),
    store,
    { count: 0 },
  );
  assert.equal(result.code, "PROVIDER_STATUS_UNKNOWN");
  assert.equal(order?.paymentStatus, "pending");
  assert.equal(mapProviderStatus("totally_unknown"), "pending");
});

test("webhook não altera fulfillment nem libera e-book", async () => {
  const { store, order, events } = mockStore();
  await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  assert.equal(order?.fulfillmentStatus, "pending");
  assert.equal(
    events.some((event) => String(event.type).includes("ebook") || String(event.type).includes("fulfill")),
    false,
  );
});

test("resposta pública não contém dados sensíveis", async () => {
  const { store } = mockStore();
  const result = await handle(signedRequest(), async () => mpOrder(), store, { count: 0 });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("maria@"), false);
  assert.equal(serialized.includes(SECRET), false);
  assert.doesNotThrow(() => assertNoSensitiveFields(result));
});

test("corrida: webhook antes de persistir provider_order_id vincula a tentativa do mesmo pedido", () => {
  const match = selectPaymentAttempt(
    [localPayment({ providerOrderId: null, status: "pending" })],
    PROVIDER_ORDER_ID,
  );
  assert.equal(match.kind, "matched");
  if (match.kind === "matched") {
    assert.equal(match.payment.id, PAYMENT_ID);
  }
});

test("corrida: não vincula pagamento de outro pedido", () => {
  const decision = decideReconciliation(
    mpOrder(),
    localOrder(),
    [
      localPayment({
        orderId: "other-order",
        providerOrderId: null,
      }),
    ],
  );
  assert.equal(decision.action, "incompatible");
});

test("erro temporário do provedor retorna 503 para retry", async () => {
  const { store } = mockStore();
  const error = Object.assign(new Error("timeout"), { status: 500 });
  const result = await handleMercadoPagoWebhook(
    signedRequest(),
    { MERCADO_PAGO_WEBHOOK_SECRET: SECRET },
    {
      now: () => NOW,
      getMercadoPago: () => ({
        createOrder: async () => {
          throw new Error("unused");
        },
        getOrder: async () => {
          throw error;
        },
      }),
      store,
    },
  );
  assert.equal(result.status, 503);
  assert.equal(result.code, "PROVIDER_UNAVAILABLE");
});
