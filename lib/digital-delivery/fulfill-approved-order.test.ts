import assert from "node:assert/strict";
import { test } from "node:test";
import { DIGITAL_SKU } from "@/lib/commerce/selection";
import { fulfillApprovedOrderDigitalDeliveries } from "@/lib/digital-delivery/fulfill-approved-order";
import { DIGITAL_DELIVERY_STALE_CLAIM_MS, isStaleSendingClaim } from "@/lib/digital-delivery/stale";
import { hashDigitalDeliveryToken } from "@/lib/digital-delivery/token";
import type {
  ClaimEmailSendResult,
  DigitalDeliveryEmailStatus,
  DigitalDeliveryEmailStore,
  DigitalDeliveryOrder,
  DigitalDeliveryOrderItem,
  DigitalDeliveryProduct,
  DigitalDeliverySendContext,
  DigitalDeliveryStore,
  InsertDigitalDeliveryInput,
} from "@/lib/digital-delivery/types";
import { handleMercadoPagoWebhook } from "@/lib/payments/handle-webhook";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import type { MercadoPagoOrder } from "@/lib/payments/types";
import { createHmac } from "node:crypto";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const DIGITAL_ITEM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PHYSICAL_ITEM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DIGITAL_PRODUCT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const PHYSICAL_PRODUCT_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const CUSTOMER_EMAIL = "comprador@example.com";
const NOW = Date.parse("2026-09-20T15:00:00.000Z");
const SECRET = "test-webhook-secret";
const PUBLIC_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PROVIDER_ORDER_ID = "ORD01ABC";

type MemoryDelivery = {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  tokenHash: string;
  emailStatus: DigitalDeliveryEmailStatus;
  emailAttempts: number;
  emailSentAt: string | null;
  lastEmailAttemptAt: string | null;
  emailProviderMessageId: string | null;
  emailProviderAcceptedAt: string | null;
  revokedAt: string | null;
};

type CombinedStore = DigitalDeliveryStore &
  DigitalDeliveryEmailStore & {
    deliveries: MemoryDelivery[];
    fulfillmentStatus: string;
    paymentStatus: DigitalDeliveryOrder["paymentStatus"];
    markSentShouldFail?: boolean;
  };

function digitalProduct(): DigitalDeliveryProduct {
  return {
    id: DIGITAL_PRODUCT_ID,
    type: "digital",
    digitalFilePath: "a-vida-e-um-dia-ebook.pdf",
  };
}

function physicalProduct(): DigitalDeliveryProduct {
  return {
    id: PHYSICAL_PRODUCT_ID,
    type: "physical",
    digitalFilePath: null,
  };
}

function memoryStore(seed?: {
  paymentStatus?: DigitalDeliveryOrder["paymentStatus"];
  fulfillmentStatus?: string;
  customerEmail?: string;
  items?: DigitalDeliveryOrderItem[];
  deliveries?: MemoryDelivery[];
  markSentShouldFail?: boolean;
}): CombinedStore {
  const order: DigitalDeliveryOrder & { customerEmail: string } = {
    id: ORDER_ID,
    paymentStatus: seed?.paymentStatus ?? "approved",
    fulfillmentStatus: seed?.fulfillmentStatus ?? "pending",
    customerEmail: seed?.customerEmail ?? CUSTOMER_EMAIL,
  };
  const items = seed?.items ?? [
    {
      id: DIGITAL_ITEM_ID,
      orderId: ORDER_ID,
      productId: DIGITAL_PRODUCT_ID,
      sku: DIGITAL_SKU,
    },
  ];
  const products = new Map<string, DigitalDeliveryProduct>([
    [DIGITAL_PRODUCT_ID, digitalProduct()],
    [PHYSICAL_PRODUCT_ID, physicalProduct()],
  ]);
  const byItem = new Map<string, MemoryDelivery>();
  const deliveries: MemoryDelivery[] = [];
  for (const row of seed?.deliveries ?? []) {
    byItem.set(row.orderItemId, row);
    deliveries.push(row);
  }
  let chain = Promise.resolve();
  let nextId = deliveries.length + 1;

  function mutate<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = chain.then(fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const store: CombinedStore = {
    markSentShouldFail: seed?.markSentShouldFail ?? false,
    get deliveries() {
      return deliveries;
    },
    get fulfillmentStatus() {
      return order.fulfillmentStatus;
    },
    get paymentStatus() {
      return order.paymentStatus;
    },
    findOrderById: async (orderId) => (order.id === orderId ? { ...order } : null),
    listOrderItems: async (orderId) =>
      items.filter((item) => item.orderId === orderId).map((item) => ({ ...item })),
    findProductById: async (productId) => {
      const product = products.get(productId);
      return product ? { ...product } : null;
    },
    insertDelivery: (input: InsertDigitalDeliveryInput) =>
      mutate(async () => {
        if (byItem.has(input.orderItemId)) {
          return { kind: "conflict" as const };
        }
        const row: MemoryDelivery = {
          id: `delivery-${nextId}`,
          orderId: input.orderId,
          orderItemId: input.orderItemId,
          productId: input.productId,
          tokenHash: input.tokenHash,
          emailStatus: "pending",
          emailAttempts: 0,
          emailSentAt: null,
          lastEmailAttemptAt: null,
          emailProviderMessageId: null,
          emailProviderAcceptedAt: null,
          revokedAt: null,
        };
        nextId += 1;
        byItem.set(input.orderItemId, row);
        deliveries.push(row);
        return { kind: "inserted" as const };
      }),
    findSendContextByOrderItemId: async (orderItemId): Promise<DigitalDeliverySendContext | null> => {
      const row = byItem.get(orderItemId);
      if (!row) {
        return null;
      }
      const product = products.get(row.productId);
      return {
        id: row.id,
        orderId: row.orderId,
        orderItemId: row.orderItemId,
        customerEmail: order.customerEmail,
        tokenHash: row.tokenHash,
        emailStatus: row.emailStatus,
        emailAttempts: row.emailAttempts,
        emailSentAt: row.emailSentAt,
        emailProviderMessageId: row.emailProviderMessageId,
        emailProviderAcceptedAt: row.emailProviderAcceptedAt,
        digitalFilePath: product?.digitalFilePath ?? null,
        revokedAt: row.revokedAt,
      };
    },
    claimEmailSend: (deliveryId, nowMs): Promise<ClaimEmailSendResult> =>
      mutate(async () => {
        const row = deliveries.find((item) => item.id === deliveryId);
        if (!row) {
          return { kind: "not_found" as const };
        }
        if (row.revokedAt) {
          return { kind: "revoked" as const };
        }
        if (row.emailStatus === "sent") {
          return { kind: "already_sent" as const };
        }
        if (row.emailProviderAcceptedAt) {
          return { kind: "provider_accepted" as const };
        }
        if (row.emailStatus === "sending" && !isStaleSendingClaim(row.lastEmailAttemptAt, nowMs)) {
          return { kind: "already_sending" as const };
        }
        if (row.emailStatus !== "pending" && row.emailStatus !== "failed" && row.emailStatus !== "sending") {
          return { kind: "lost_race" as const };
        }
        row.emailStatus = "sending";
        row.emailAttempts += 1;
        row.lastEmailAttemptAt = new Date(nowMs).toISOString();
        return {
          kind: "claimed" as const,
          tokenHash: row.tokenHash,
          emailAttempts: row.emailAttempts,
        };
      }),
    updateTokenHashIfSending: (deliveryId, tokenHash) =>
      mutate(async () => {
        const row = deliveries.find((item) => item.id === deliveryId);
        if (!row || row.emailStatus !== "sending" || row.emailProviderAcceptedAt) {
          return false;
        }
        row.tokenHash = tokenHash;
        return true;
      }),
    recordEmailProviderAccepted: (deliveryId, providerMessageId, acceptedAtMs) =>
      mutate(async () => {
        const row = deliveries.find((item) => item.id === deliveryId);
        if (!row) {
          return false;
        }
        if (row.emailProviderAcceptedAt) {
          return true;
        }
        if (row.emailStatus !== "sending") {
          return false;
        }
        row.emailProviderMessageId = providerMessageId;
        row.emailProviderAcceptedAt = new Date(acceptedAtMs).toISOString();
        return true;
      }),
    markEmailSent: (deliveryId, sentAtMs) =>
      mutate(async () => {
        if (store.markSentShouldFail) {
          return false;
        }
        const row = deliveries.find((item) => item.id === deliveryId);
        if (!row || row.emailStatus !== "sending") {
          return false;
        }
        row.emailStatus = "sent";
        row.emailSentAt = new Date(sentAtMs).toISOString();
        return true;
      }),
    markEmailFailed: (deliveryId) =>
      mutate(async () => {
        const row = deliveries.find((item) => item.id === deliveryId);
        if (!row || row.emailStatus !== "sending" || row.emailProviderAcceptedAt) {
          return false;
        }
        row.emailStatus = "failed";
        return true;
      }),
  };

  return store;
}

function captureLogs() {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
  };
  return {
    lines,
    restore() {
      console.error = original;
    },
  };
}

function assertSafePublicPayload(payload: unknown, extraForbidden: string[] = []) {
  const serialized = JSON.stringify(payload);
  assert.doesNotThrow(() => assertNoSensitiveFields(payload));
  assert.equal(serialized.includes(CUSTOMER_EMAIL), false);
  assert.equal(serialized.toLowerCase().includes("resend"), false);
  assert.equal(serialized.includes("re_"), false);
  assert.equal(serialized.includes("SUPABASE"), false);
  for (const value of extraForbidden) {
    assert.equal(serialized.includes(value), false);
  }
}

test("approved + created → claim → envia → sent", async () => {
  const store = memoryStore();
  let sends = 0;
  const logs = captureLogs();
  try {
    const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
      nowMs: NOW,
      sendEmail: async () => {
        sends += 1;
        return { ok: true, providerMessageId: "msg_ebook_1" };
      },
    });
    assert.equal(result.items[0]?.status, "sent");
    assert.equal(result.needsRetry, false);
    assert.equal(sends, 1);
    assert.equal(store.deliveries[0]?.emailStatus, "sent");
    assert.equal(store.deliveries[0]?.emailProviderMessageId, "msg_ebook_1");
    assert.equal(store.deliveries[0]?.emailProviderAcceptedAt, new Date(NOW).toISOString());
    assert.equal(store.fulfillmentStatus, "pending");
    assertSafePublicPayload(result);
    assert.equal(logs.lines.join("\n").includes(CUSTOMER_EMAIL), false);
  } finally {
    logs.restore();
  }
});

test("approved + already_exists pending → claim/rotação → envia → sent", async () => {
  const existingHash = hashDigitalDeliveryToken("old-raw-token-value");
  const store = memoryStore({
    deliveries: [
      {
        id: "delivery-1",
        orderId: ORDER_ID,
        orderItemId: DIGITAL_ITEM_ID,
        productId: DIGITAL_PRODUCT_ID,
        tokenHash: existingHash,
        emailStatus: "pending",
        emailAttempts: 0,
        emailSentAt: null,
        lastEmailAttemptAt: null,
        emailProviderMessageId: null,
        emailProviderAcceptedAt: null,
        revokedAt: null,
      },
    ],
  });
  let capturedToken: string | null = null;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async (input) => {
      capturedToken = input.rawToken;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(result.items[0]?.status, "sent");
  assert.equal(store.deliveries[0]?.emailStatus, "sent");
  assert.notEqual(store.deliveries[0]?.tokenHash, existingHash);
  assert.ok(capturedToken);
  assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(capturedToken ?? ""));
  assert.notEqual(capturedToken, "old-raw-token-value");
  const persisted = JSON.stringify(store.deliveries);
  assert.equal(persisted.includes(capturedToken ?? "MISSING"), false);
  assertSafePublicPayload(result, [capturedToken ?? ""]);
});

test("sent → não envia", async () => {
  const store = memoryStore({
    deliveries: [
      {
        id: "delivery-1",
        orderId: ORDER_ID,
        orderItemId: DIGITAL_ITEM_ID,
        productId: DIGITAL_PRODUCT_ID,
        tokenHash: "aa".repeat(32),
        emailStatus: "sent",
        emailAttempts: 1,
        emailSentAt: new Date(NOW - 1_000).toISOString(),
        lastEmailAttemptAt: new Date(NOW - 1_000).toISOString(),
        emailProviderMessageId: null,
        emailProviderAcceptedAt: null,
        revokedAt: null,
      },
    ],
  });
  let sends = 0;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(result.items[0]?.status, "already_sent");
  assert.equal(sends, 0);
  assert.equal(store.deliveries[0]?.emailStatus, "sent");
  assert.equal(result.needsRetry, false);
});

test("webhook duplicado → não envia duas vezes", async () => {
  const store = memoryStore();
  let sends = 0;
  const deps = {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true as const, providerMessageId: "msg_ebook_1" };
    },
  };
  const first = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, deps);
  const second = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, deps);
  assert.equal(first.items[0]?.status, "sent");
  assert.equal(second.items[0]?.status, "already_sent");
  assert.equal(sends, 1);
});

test("corrida → somente um claim/envio", async () => {
  const store = memoryStore();
  let sends = 0;
  const [a, b] = await Promise.all([
    fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
      nowMs: NOW,
      sendEmail: async () => {
        sends += 1;
        return { ok: true, providerMessageId: "msg_ebook_1" };
      },
    }),
    fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
      nowMs: NOW,
      sendEmail: async () => {
        sends += 1;
        return { ok: true, providerMessageId: "msg_ebook_1" };
      },
    }),
  ]);
  const statuses = [a.items[0]?.status, b.items[0]?.status].sort();
  assert.deepEqual(statuses, ["already_sending", "sent"]);
  assert.equal(sends, 1);
  assert.equal(store.deliveries[0]?.emailStatus, "sent");
  assert.equal(store.deliveries[0]?.emailAttempts, 1);
});

test("Resend falha → failed e needsRetry", async () => {
  const store = memoryStore();
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => ({ ok: false, code: "EMAIL_SEND_FAILED" }),
  });
  assert.equal(result.items[0]?.status, "failed");
  assert.equal(result.needsRetry, true);
  assert.equal(store.deliveries[0]?.emailStatus, "failed");
  assert.equal(store.fulfillmentStatus, "pending");
  assertSafePublicPayload(result);
});

test("retry após failed → novo envio possível", async () => {
  const store = memoryStore();
  const first = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => ({ ok: false, code: "EMAIL_SEND_FAILED" }),
  });
  assert.equal(first.needsRetry, true);
  const hashAfterFail = store.deliveries[0]?.tokenHash;
  let sends = 0;
  const second = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW + 1,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(second.items[0]?.status, "sent");
  assert.equal(sends, 1);
  assert.equal(store.deliveries[0]?.emailStatus, "sent");
  assert.notEqual(store.deliveries[0]?.tokenHash, hashAfterFail);
});

test("sending recente → não envia", async () => {
  const store = memoryStore({
    deliveries: [
      {
        id: "delivery-1",
        orderId: ORDER_ID,
        orderItemId: DIGITAL_ITEM_ID,
        productId: DIGITAL_PRODUCT_ID,
        tokenHash: "bb".repeat(32),
        emailStatus: "sending",
        emailAttempts: 1,
        emailSentAt: null,
        lastEmailAttemptAt: new Date(NOW - 60_000).toISOString(),
        emailProviderMessageId: null,
        emailProviderAcceptedAt: null,
        revokedAt: null,
      },
    ],
  });
  let sends = 0;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(result.items[0]?.status, "already_sending");
  assert.equal(sends, 0);
  assert.equal(store.deliveries[0]?.emailAttempts, 1);
  assert.equal(result.needsRetry, false);
});

test("sending stale → recupera e envia", async () => {
  const oldHash = "cc".repeat(32);
  const store = memoryStore({
    deliveries: [
      {
        id: "delivery-1",
        orderId: ORDER_ID,
        orderItemId: DIGITAL_ITEM_ID,
        productId: DIGITAL_PRODUCT_ID,
        tokenHash: oldHash,
        emailStatus: "sending",
        emailAttempts: 1,
        emailSentAt: null,
        lastEmailAttemptAt: new Date(NOW - DIGITAL_DELIVERY_STALE_CLAIM_MS).toISOString(),
        emailProviderMessageId: null,
        emailProviderAcceptedAt: null,
        revokedAt: null,
      },
    ],
  });
  let sends = 0;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(result.items[0]?.status, "sent");
  assert.equal(sends, 1);
  assert.notEqual(store.deliveries[0]?.tokenHash, oldHash);
  assert.equal(store.deliveries[0]?.emailAttempts, 2);
});

test("skipped → não envia", async () => {
  const store = memoryStore({
    items: [
      {
        id: PHYSICAL_ITEM_ID,
        orderId: ORDER_ID,
        productId: PHYSICAL_PRODUCT_ID,
        sku: "AVIDA-FISICO",
      },
    ],
  });
  let sends = 0;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(result.items[0]?.status, "skipped");
  assert.equal(sends, 0);
  assert.equal(store.deliveries.length, 0);
  assert.equal(result.needsRetry, false);
});

test("pagamento não approved → não envia", async () => {
  const store = memoryStore({ paymentStatus: "pending" });
  let sends = 0;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(result.items[0]?.status, "skipped");
  if (result.items[0]?.status === "skipped") {
    assert.equal(result.items[0].reason, "payment_not_approved");
  }
  assert.equal(sends, 0);
});

test("markSent só ocorre após sucesso do Resend", async () => {
  const failedStore = memoryStore();
  let markSentOnFailure = 0;
  const failedOriginal = failedStore.markEmailSent.bind(failedStore);
  failedStore.markEmailSent = async (deliveryId, sentAtMs) => {
    markSentOnFailure += 1;
    return failedOriginal(deliveryId, sentAtMs);
  };
  await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, failedStore, {
    nowMs: NOW,
    sendEmail: async () => ({ ok: false, code: "EMAIL_SEND_FAILED" }),
  });
  assert.equal(markSentOnFailure, 0);
  assert.equal(failedStore.deliveries[0]?.emailStatus, "failed");

  const okStore = memoryStore();
  let markSentOnSuccess = 0;
  const okOriginal = okStore.markEmailSent.bind(okStore);
  okStore.markEmailSent = async (deliveryId, sentAtMs) => {
    markSentOnSuccess += 1;
    return okOriginal(deliveryId, sentAtMs);
  };
  await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, okStore, {
    nowMs: NOW,
    sendEmail: async () => {
      assert.equal(markSentOnSuccess, 0);
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(markSentOnSuccess, 1);
  assert.equal(okStore.deliveries[0]?.emailStatus, "sent");
});

test("falha markSent após Resend sucesso não reenvia nem marca failed", async () => {
  const store = memoryStore({ markSentShouldFail: true });
  let sends = 0;
  const first = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    markSentAttempts: 3,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(first.items[0]?.status, "accepted_unconfirmed");
  assert.equal(first.needsRetry, true);
  assert.equal(sends, 1);
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
  assert.equal(store.deliveries[0]?.emailProviderMessageId, "msg_ebook_1");
  assert.ok(store.deliveries[0]?.emailProviderAcceptedAt);

  const second = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW + 1_000,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_should_not_send" };
    },
  });
  assert.equal(second.items[0]?.status, "accepted_unconfirmed");
  assert.equal(sends, 1);
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
  assert.equal(store.deliveries[0]?.tokenHash, store.deliveries[0]?.tokenHash);
  assertSafePublicPayload(first);
  assertSafePublicPayload(second, ["msg_ebook_1", "msg_should_not_send"]);
});

test("webhook posterior reconcilia provider accepted → sent sem novo Resend", async () => {
  const hash = "dd".repeat(32);
  const store = memoryStore({
    deliveries: [
      {
        id: "delivery-1",
        orderId: ORDER_ID,
        orderItemId: DIGITAL_ITEM_ID,
        productId: DIGITAL_PRODUCT_ID,
        tokenHash: hash,
        emailStatus: "sending",
        emailAttempts: 1,
        emailSentAt: null,
        lastEmailAttemptAt: new Date(NOW - DIGITAL_DELIVERY_STALE_CLAIM_MS).toISOString(),
        emailProviderMessageId: "msg_ebook_1",
        emailProviderAcceptedAt: new Date(NOW - DIGITAL_DELIVERY_STALE_CLAIM_MS).toISOString(),
        revokedAt: null,
      },
    ],
  });
  let sends = 0;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "msg_should_not_send" };
    },
  });
  assert.equal(result.items[0]?.status, "sent");
  assert.equal(result.needsRetry, false);
  assert.equal(sends, 0);
  assert.equal(store.deliveries[0]?.emailStatus, "sent");
  assert.equal(store.deliveries[0]?.tokenHash, hash);
  assert.equal(store.deliveries[0]?.emailProviderMessageId, "msg_ebook_1");
});

test("Resend failure não grava provider accepted", async () => {
  const store = memoryStore();
  await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => ({ ok: false, code: "EMAIL_SEND_FAILED" }),
  });
  assert.equal(store.deliveries[0]?.emailStatus, "failed");
  assert.equal(store.deliveries[0]?.emailProviderAcceptedAt, null);
  assert.equal(store.deliveries[0]?.emailProviderMessageId, null);
});


test("fulfillment_status permanece inalterado", async () => {
  const store = memoryStore({ fulfillmentStatus: "pending" });
  await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => ({ ok: true, providerMessageId: "msg_ebook_1" }),
  });
  assert.equal(store.fulfillmentStatus, "pending");
});

test("created reutiliza token válido sem persistir rawToken", async () => {
  const store = memoryStore();
  let reused: string | null = null;
  const result = await fulfillApprovedOrderDigitalDeliveries(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async (input) => {
      reused = input.rawToken;
      return { ok: true, providerMessageId: "msg_ebook_1" };
    },
  });
  assert.equal(result.items[0]?.status, "sent");
  assert.ok(reused);
  assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(reused ?? ""));
  assert.equal(JSON.stringify(store.deliveries).includes(reused ?? "MISSING"), false);
  assert.equal(JSON.stringify(result).includes(reused ?? "MISSING"), false);
});

test("webhook approved com falha de envio retorna 503 sem desfazer pagamento", async () => {
  const ts = String(Math.floor(NOW / 1000));
  const requestId = "req-fulfill";
  const manifest = `id:${PROVIDER_ORDER_ID.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex");
  const request = new Request(
    `https://www.robsonsantiago.com.br/api/webhooks/mercado-pago?data.id=${PROVIDER_ORDER_ID}`,
    {
      method: "POST",
      headers: {
        "x-signature": `ts=${ts},v1=${v1}`,
        "x-request-id": requestId,
      },
      body: JSON.stringify({ type: "order", data: { id: PROVIDER_ORDER_ID } }),
    },
  );

  let paymentStatus = "pending";
  const store = memoryStore();
  const result = await handleMercadoPagoWebhook(
    request,
    { MERCADO_PAGO_WEBHOOK_SECRET: SECRET },
    {
      now: () => NOW,
      getMercadoPago: () => ({
        createOrder: async () => {
          throw new Error("unused");
        },
        getOrder: async (): Promise<MercadoPagoOrder> => ({
          id: PROVIDER_ORDER_ID,
          status: "processed",
          status_detail: "accredited",
          external_reference: PUBLIC_ID,
          total_amount: "19.90",
          total_paid_amount: "19.90",
          currency: "BRL",
          transactions: {
            payments: [{ id: "PAY01", status: "processed", amount: "19.90", paid_amount: "19.90" }],
          },
        }),
      }),
      store: {
        findOrderByPublicId: async () => ({
          id: ORDER_ID,
          publicId: PUBLIC_ID,
          totalCents: 1990,
          currency: "BRL",
          paymentStatus: paymentStatus as "pending",
          fulfillmentStatus: "pending",
          paidAt: null,
        }),
        listPaymentsForOrder: async () => [
          {
            id: "pay-row",
            orderId: ORDER_ID,
            provider: "mercado_pago",
            providerOrderId: PROVIDER_ORDER_ID,
            providerPaymentId: "PAY01",
            status: "pending",
          },
        ],
        updatePayment: async () => undefined,
        updateOrderPaymentStatus: async (_id, status) => {
          paymentStatus = status;
        },
        insertEvent: async () => undefined,
      },
      ensureDigitalDeliveries: async (orderId) => {
        const fulfill = await fulfillApprovedOrderDigitalDeliveries(orderId, store, {
          nowMs: NOW,
          sendEmail: async () => ({ ok: false, code: "EMAIL_SEND_FAILED" }),
        });
        if (fulfill.needsRetry) {
          throw new Error("DIGITAL_DELIVERY_RETRY");
        }
      },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, "DIGITAL_DELIVERY_FAILED");
  assert.equal(paymentStatus, "approved");
  assert.equal(store.deliveries[0]?.emailStatus, "failed");
  assert.equal(store.fulfillmentStatus, "pending");
  assertSafePublicPayload(result);
});
