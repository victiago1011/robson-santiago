import assert from "node:assert/strict";
import { test } from "node:test";
import { DIGITAL_SKU } from "@/lib/commerce/selection";
import {
  claimDigitalDeliveryForSend,
  markDigitalDeliveryEmailFailed,
  markDigitalDeliveryEmailSent,
  prepareDigitalDeliverySendFromEnsureItem,
  recordDigitalDeliveryProviderAccepted,
} from "@/lib/digital-delivery/claim";
import { ensureDigitalDeliveries } from "@/lib/digital-delivery/ensure";
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
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const DIGITAL_ITEM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DIGITAL_PRODUCT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CUSTOMER_EMAIL = "comprador@example.com";
const NOW = Date.parse("2026-09-20T15:00:00.000Z");

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
  };

function digitalProduct(): DigitalDeliveryProduct {
  return {
    id: DIGITAL_PRODUCT_ID,
    type: "digital",
    digitalFilePath: "a-vida-e-um-dia-ebook.pdf",
  };
}

function digitalItem(): DigitalDeliveryOrderItem {
  return {
    id: DIGITAL_ITEM_ID,
    orderId: ORDER_ID,
    productId: DIGITAL_PRODUCT_ID,
    sku: DIGITAL_SKU,
  };
}

function memoryStore(seed?: {
  paymentStatus?: DigitalDeliveryOrder["paymentStatus"];
  fulfillmentStatus?: string;
  customerEmail?: string;
  deliveries?: MemoryDelivery[];
}): CombinedStore {
  const order: DigitalDeliveryOrder & { customerEmail: string } = {
    id: ORDER_ID,
    paymentStatus: seed?.paymentStatus ?? "approved",
    fulfillmentStatus: seed?.fulfillmentStatus ?? "pending",
    customerEmail: seed?.customerEmail ?? CUSTOMER_EMAIL,
  };
  const items = [digitalItem()];
  const products = new Map([[DIGITAL_PRODUCT_ID, digitalProduct()]]);
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
    chain = run.then(() => undefined, () => undefined);
    return run;
  }

  const store: CombinedStore = {
    get deliveries() {
      return deliveries;
    },
    get fulfillmentStatus() {
      return order.fulfillmentStatus;
    },
    findOrderById: async (orderId) => (order.id === orderId ? { ...order } : null),
    listOrderItems: async (orderId) => items.filter((item) => item.orderId === orderId).map((item) => ({ ...item })),
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
        if (!row || row.emailStatus !== "sending") {
          return Boolean(row?.emailProviderAcceptedAt);
        }
        if (row.emailProviderAcceptedAt) {
          return true;
        }
        row.emailProviderMessageId = providerMessageId;
        row.emailProviderAcceptedAt = new Date(acceptedAtMs).toISOString();
        return true;
      }),
    markEmailSent: (deliveryId, sentAtMs) =>
      mutate(async () => {
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

async function seedPendingDelivery(store: CombinedStore) {
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  const created = result.items[0];
  assert.equal(created?.status, "created");
  if (created?.status !== "created") {
    throw new Error("expected created");
  }
  return { store, created, result };
}

test("pending → claim → sending e incrementa email_attempts", async () => {
  const store = memoryStore();
  const { created } = await seedPendingDelivery(store);
  assert.equal(store.deliveries[0]?.emailStatus, "pending");
  assert.equal(store.deliveries[0]?.emailAttempts, 0);

  const claimed = await claimDigitalDeliveryForSend(
    { orderItemId: DIGITAL_ITEM_ID, existingRawToken: created.rawToken },
    store,
    NOW,
  );

  assert.equal(claimed.status, "claimed");
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
  assert.equal(store.deliveries[0]?.emailAttempts, 1);
  assert.equal(store.deliveries[0]?.lastEmailAttemptAt, new Date(NOW).toISOString());
  assert.equal(store.fulfillmentStatus, "pending");
  if (claimed.status === "claimed") {
    assert.equal(claimed.reusedExistingToken, true);
    assert.equal(claimed.rawToken, created.rawToken);
    assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(created.rawToken));
  }
});

test("failed → claim → sending", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  store.deliveries[0].emailStatus = "failed";
  store.deliveries[0].emailAttempts = 2;
  const hashBefore = store.deliveries[0].tokenHash;

  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "claimed");
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
  assert.equal(store.deliveries[0]?.emailAttempts, 3);
  assert.notEqual(store.deliveries[0]?.tokenHash, hashBefore);
  if (claimed.status === "claimed") {
    assert.equal(claimed.reusedExistingToken, false);
    assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(claimed.rawToken));
  }
});

test("sending recente → claim negado e sem rawToken", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  store.deliveries[0].emailStatus = "sending";
  store.deliveries[0].emailAttempts = 1;
  store.deliveries[0].lastEmailAttemptAt = new Date(NOW - 60_000).toISOString();
  const hashBefore = store.deliveries[0].tokenHash;

  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "already_sending");
  assert.equal("rawToken" in claimed, false);
  assert.equal(store.deliveries[0]?.tokenHash, hashBefore);
  assert.equal(store.deliveries[0]?.emailAttempts, 1);
});

test("sending stale → recuperação permitida com nova rotação", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  const hashBefore = store.deliveries[0].tokenHash;
  store.deliveries[0].emailStatus = "sending";
  store.deliveries[0].emailAttempts = 1;
  store.deliveries[0].lastEmailAttemptAt = new Date(NOW - DIGITAL_DELIVERY_STALE_CLAIM_MS).toISOString();

  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "claimed");
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
  assert.equal(store.deliveries[0]?.emailAttempts, 2);
  assert.notEqual(store.deliveries[0]?.tokenHash, hashBefore);
  if (claimed.status === "claimed") {
    assert.equal(claimed.reusedExistingToken, false);
    assert.equal(JSON.stringify(store.deliveries).includes(claimed.rawToken), false);
  }
});

test("sent → claim negado e token_hash inalterado", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  store.deliveries[0].emailStatus = "sent";
  store.deliveries[0].emailAttempts = 1;
  store.deliveries[0].emailSentAt = new Date(NOW - 1_000).toISOString();
  const hashBefore = store.deliveries[0].tokenHash;

  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "already_sent");
  assert.equal("rawToken" in claimed, false);
  assert.equal(store.deliveries[0]?.tokenHash, hashBefore);
  assert.equal(store.deliveries[0]?.emailStatus, "sent");
});

test("dois claims concorrentes → somente um vence", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);

  const [first, second] = await Promise.all([
    claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW),
    claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW),
  ]);
  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["already_sending", "claimed"]);
  const winner = first.status === "claimed" ? first : second;
  const loser = first.status === "claimed" ? second : first;
  assert.equal(winner.status, "claimed");
  assert.equal(loser.status, "already_sending");
  assert.equal("rawToken" in loser, false);
  assert.equal(store.deliveries[0]?.emailAttempts, 1);
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
});

test("token bruto nunca é persistido e rotação altera token_hash", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  const hashBefore = store.deliveries[0].tokenHash;

  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "claimed");
  if (claimed.status !== "claimed") {
    throw new Error("expected claimed");
  }
  assert.notEqual(store.deliveries[0]?.tokenHash, hashBefore);
  assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(claimed.rawToken));
  const persisted = JSON.stringify(store.deliveries);
  assert.equal(persisted.includes(claimed.rawToken), false);
  assert.equal("rawToken" in store.deliveries[0], false);
});

test("sent nunca rotaciona token", async () => {
  const store = memoryStore();
  const { created } = await seedPendingDelivery(store);
  const claimed = await claimDigitalDeliveryForSend(
    { orderItemId: DIGITAL_ITEM_ID, existingRawToken: created.rawToken },
    store,
    NOW,
  );
  assert.equal(claimed.status, "claimed");
  if (claimed.status !== "claimed") {
    throw new Error("expected claimed");
  }
  const marked = await markDigitalDeliveryEmailSent(claimed.deliveryId, store, NOW + 1);
  assert.equal(marked, true);
  const hashAfterSent = store.deliveries[0]?.tokenHash;

  const again = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW + 2);
  assert.equal(again.status, "already_sent");
  assert.equal(store.deliveries[0]?.tokenHash, hashAfterSent);
  assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(created.rawToken));

  const rotated = await store.updateTokenHashIfSending(claimed.deliveryId, "00".repeat(32));
  assert.equal(rotated, false);
  assert.equal(store.deliveries[0]?.tokenHash, hashAfterSent);
});

test("markSent define email_status e email_sent_at", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "claimed");
  if (claimed.status !== "claimed") {
    throw new Error("expected claimed");
  }
  const ok = await markDigitalDeliveryEmailSent(claimed.deliveryId, store, NOW + 50);
  assert.equal(ok, true);
  assert.equal(store.deliveries[0]?.emailStatus, "sent");
  assert.equal(store.deliveries[0]?.emailSentAt, new Date(NOW + 50).toISOString());
  assert.equal(store.fulfillmentStatus, "pending");
});

test("markFailed define email_status = failed", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "claimed");
  if (claimed.status !== "claimed") {
    throw new Error("expected claimed");
  }
  const ok = await markDigitalDeliveryEmailFailed(claimed.deliveryId, store);
  assert.equal(ok, true);
  assert.equal(store.deliveries[0]?.emailStatus, "failed");
  assert.equal(store.deliveries[0]?.emailSentAt, null);
});

test("already_exists recupera entrega ainda não enviada", async () => {
  const store = memoryStore();
  const first = await ensureDigitalDeliveries(ORDER_ID, store);
  const second = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(first.items[0]?.status, "created");
  assert.equal(second.items[0]?.status, "already_exists");
  const hashBefore = store.deliveries[0]?.tokenHash;

  const prepared = await prepareDigitalDeliverySendFromEnsureItem(second.items[0], store, NOW);
  assert.equal(prepared.status, "claimed");
  if (prepared.status !== "claimed") {
    throw new Error("expected claimed");
  }
  assert.equal(prepared.reusedExistingToken, false);
  assert.notEqual(store.deliveries[0]?.tokenHash, hashBefore);
  assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(prepared.rawToken));
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
  if (first.items[0]?.status === "created") {
    assert.notEqual(prepared.rawToken, first.items[0].rawToken);
  }
});

test("created reutiliza rawToken do ensure sem rotacionar", async () => {
  const store = memoryStore();
  const ensured = await ensureDigitalDeliveries(ORDER_ID, store);
  const prepared = await prepareDigitalDeliverySendFromEnsureItem(ensured.items[0], store, NOW);
  assert.equal(prepared.status, "claimed");
  if (prepared.status !== "claimed" || ensured.items[0]?.status !== "created") {
    throw new Error("expected claimed from created");
  }
  assert.equal(prepared.reusedExistingToken, true);
  assert.equal(prepared.rawToken, ensured.items[0].rawToken);
  assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(ensured.items[0].rawToken));
});

test("resumo público do claim não inclui token", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  const publicSummary = {
    status: claimed.status,
    deliveryId: claimed.status === "claimed" ? claimed.deliveryId : null,
  };
  assert.doesNotThrow(() => assertNoSensitiveFields(publicSummary));
});

test("isStaleSendingClaim: recente exclusivo, nulo e vencido recuperáveis", () => {
  assert.equal(isStaleSendingClaim(new Date(NOW - 1_000).toISOString(), NOW), false);
  assert.equal(
    isStaleSendingClaim(new Date(NOW - DIGITAL_DELIVERY_STALE_CLAIM_MS + 1).toISOString(), NOW),
    false,
  );
  assert.equal(
    isStaleSendingClaim(new Date(NOW - DIGITAL_DELIVERY_STALE_CLAIM_MS).toISOString(), NOW),
    true,
  );
  assert.equal(isStaleSendingClaim(null, NOW), true);
});

test("provider accepted nunca sofre stale reclaim nem rotaciona token", async () => {
  const store = memoryStore();
  await seedPendingDelivery(store);
  const claimed = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(claimed.status, "claimed");
  if (claimed.status !== "claimed") {
    throw new Error("expected claimed");
  }
  const hashBefore = store.deliveries[0]?.tokenHash;
  const recorded = await recordDigitalDeliveryProviderAccepted(
    claimed.deliveryId,
    "re_msg_accepted",
    store,
    NOW + 10,
  );
  assert.equal(recorded, true);
  store.deliveries[0].lastEmailAttemptAt = new Date(NOW - DIGITAL_DELIVERY_STALE_CLAIM_MS).toISOString();

  const again = await claimDigitalDeliveryForSend({ orderItemId: DIGITAL_ITEM_ID }, store, NOW);
  assert.equal(again.status, "provider_accepted");
  assert.equal("rawToken" in again, false);
  assert.equal(store.deliveries[0]?.tokenHash, hashBefore);
  assert.equal(store.deliveries[0]?.emailAttempts, 1);
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
  assert.equal(store.deliveries[0]?.emailProviderMessageId, "re_msg_accepted");

  const rotated = await store.updateTokenHashIfSending(claimed.deliveryId, "00".repeat(32));
  assert.equal(rotated, false);
  assert.equal(store.deliveries[0]?.tokenHash, hashBefore);

  const failed = await markDigitalDeliveryEmailFailed(claimed.deliveryId, store);
  assert.equal(failed, false);
  assert.equal(store.deliveries[0]?.emailStatus, "sending");
});
