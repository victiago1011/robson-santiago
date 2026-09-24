import assert from "node:assert/strict";
import { test } from "node:test";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  claimOrderEmailForSend,
  ensureOrderEmailNotification,
} from "@/lib/notifications/claim";
import { notifyAdminPhysicalSale } from "@/lib/notifications/notify-admin-physical-sale";
import { notifyBuyerOrderConfirmed } from "@/lib/notifications/notify-buyer-order-confirmed";
import { notifyBuyerShipped } from "@/lib/notifications/notify-buyer-shipped";
import { ORDER_EMAIL_STALE_CLAIM_MS, isStaleSendingClaim } from "@/lib/notifications/stale";
import type {
  AdminPhysicalSaleOrderContext,
  BuyerOrderConfirmedContext,
  BuyerShippedOrderContext,
  ClaimOrderEmailSendResult,
  OrderEmailNotificationKind,
  OrderEmailNotificationRow,
  OrderEmailNotificationStatus,
  OrderEmailNotificationStore,
} from "@/lib/notifications/types";
import { createOrderTrackingAccess } from "@/lib/order-tracking/create";
import type {
  OrderTrackingAccessRow,
  OrderTrackingOrderSnapshot,
  OrderTrackingStore,
} from "@/lib/order-tracking/types";
import { resolveOrderTracking } from "@/lib/order-tracking/resolve";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PUBLIC_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NOW = Date.parse("2026-09-23T12:00:00.000Z");
const APP_URL = "https://www.robsonsantiago.com.br";

type MemoryRow = {
  id: string;
  orderId: string;
  kind: OrderEmailNotificationKind;
  status: OrderEmailNotificationStatus;
  attempts: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
  providerAcceptedAt: string | null;
};

function mapRow(row: MemoryRow): OrderEmailNotificationRow {
  return {
    id: row.id,
    orderId: row.orderId,
    kind: row.kind,
    status: row.status,
    attempts: row.attempts,
    lastAttemptAt: row.lastAttemptAt,
    sentAt: row.sentAt,
    providerMessageId: row.providerMessageId,
    providerAcceptedAt: row.providerAcceptedAt,
  };
}

function memoryStore(seed?: {
  adminContext?: AdminPhysicalSaleOrderContext | null;
  buyerContext?: BuyerShippedOrderContext | null;
  confirmedContext?: BuyerOrderConfirmedContext | null;
  rows?: MemoryRow[];
}): OrderEmailNotificationStore & {
  rows: MemoryRow[];
  events: Array<{ type: string; metadata: Record<string, unknown> }>;
} {
  const rows: MemoryRow[] = [...(seed?.rows ?? [])];
  const events: Array<{ type: string; metadata: Record<string, unknown> }> = [];
  let nextId = rows.length + 1;
  let chain = Promise.resolve();

  function mutate<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = chain.then(fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const adminContext =
    seed?.adminContext === undefined
      ? ({
          orderId: ORDER_ID,
          publicId: PUBLIC_ID,
          paymentStatus: "approved",
          customerName: "Maria",
          customerEmail: "maria@example.com",
          totalCents: 6490,
          paidAt: "2026-09-23T12:00:00.000Z",
          shippingZip: "01310100",
          shippingStreet: "Av Paulista",
          shippingNumber: "1000",
          shippingComplement: null,
          shippingDistrict: "Bela Vista",
          shippingCity: "São Paulo",
          shippingState: "SP",
          items: [{ sku: PHYSICAL_SKU, quantity: 1, title: "Livro" }],
        } satisfies AdminPhysicalSaleOrderContext)
      : seed.adminContext;

  const buyerContext =
    seed?.buyerContext === undefined
      ? ({
          orderId: ORDER_ID,
          publicId: PUBLIC_ID,
          paymentStatus: "approved",
          fulfillmentStatus: "shipped",
          customerEmail: "maria@example.com",
          customerName: "Maria",
          trackingCode: "AB123456789BR",
          shippedAt: "2026-09-23T15:00:00.000Z",
          items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
        } satisfies BuyerShippedOrderContext)
      : seed.buyerContext;

  const confirmedContext =
    seed?.confirmedContext === undefined
      ? ({
          orderId: ORDER_ID,
          publicId: PUBLIC_ID,
          paymentStatus: "approved",
          customerName: "Maria",
          customerEmail: "maria@example.com",
          totalCents: 6490,
          items: [{ sku: PHYSICAL_SKU, quantity: 1, title: "Livro" }],
        } satisfies BuyerOrderConfirmedContext)
      : seed.confirmedContext;

  return {
    rows,
    events,
    findNotification: async (orderId, kind) => {
      const row = rows.find((r) => r.orderId === orderId && r.kind === kind);
      return row ? mapRow(row) : null;
    },
    insertNotification: (orderId, kind) =>
      mutate(async () => {
        const existing = rows.find((r) => r.orderId === orderId && r.kind === kind);
        if (existing) {
          return { kind: "conflict" as const, id: existing.id };
        }
        const id = `notif-${nextId}`;
        nextId += 1;
        rows.push({
          id,
          orderId,
          kind,
          status: "pending",
          attempts: 0,
          lastAttemptAt: null,
          sentAt: null,
          providerMessageId: null,
          providerAcceptedAt: null,
        });
        return { kind: "inserted" as const, id };
      }),
    claimEmailSend: (notificationId, nowMs) =>
      mutate(async (): Promise<ClaimOrderEmailSendResult> => {
        const row = rows.find((r) => r.id === notificationId);
        if (!row) {
          return { kind: "not_found" };
        }
        if (row.status === "sent") {
          return { kind: "already_sent", notificationId };
        }
        if (row.providerAcceptedAt) {
          return { kind: "provider_accepted", notificationId };
        }
        if (
          row.status === "sending" &&
          !isStaleSendingClaim(row.lastAttemptAt, nowMs, ORDER_EMAIL_STALE_CLAIM_MS)
        ) {
          return { kind: "already_sending", notificationId };
        }
        if (row.status !== "pending" && row.status !== "failed" && row.status !== "sending") {
          return { kind: "lost_race" };
        }
        row.status = "sending";
        row.attempts += 1;
        row.lastAttemptAt = new Date(nowMs).toISOString();
        return { kind: "claimed", notificationId, attempts: row.attempts };
      }),
    recordProviderAccepted: (notificationId, providerMessageId, acceptedAtMs) =>
      mutate(async () => {
        const row = rows.find((r) => r.id === notificationId);
        if (!row || row.status !== "sending" || row.providerAcceptedAt) {
          return Boolean(row?.providerAcceptedAt);
        }
        row.providerMessageId = providerMessageId;
        row.providerAcceptedAt = new Date(acceptedAtMs).toISOString();
        return true;
      }),
    markSent: (notificationId, sentAtMs) =>
      mutate(async () => {
        const row = rows.find((r) => r.id === notificationId);
        if (!row || row.status !== "sending") {
          return false;
        }
        row.status = "sent";
        row.sentAt = new Date(sentAtMs).toISOString();
        return true;
      }),
    markFailed: (notificationId) =>
      mutate(async () => {
        const row = rows.find((r) => r.id === notificationId);
        if (!row || row.status !== "sending" || row.providerAcceptedAt) {
          return false;
        }
        row.status = "failed";
        return true;
      }),
    findAdminPhysicalSaleContext: async () => adminContext,
    findBuyerShippedContext: async () => buyerContext,
    findBuyerOrderConfirmedContext: async () => confirmedContext,
    insertOrderEvent: async (_orderId, eventType, metadata) => {
      events.push({ type: eventType, metadata });
    },
  };
}

function memoryTrackingStore(): OrderTrackingStore & {
  accessRows: OrderTrackingAccessRow[];
  issuedRawTokens: string[];
} {
  const accessRows: OrderTrackingAccessRow[] = [];
  const issuedRawTokens: string[] = [];
  let nextId = 1;
  const order: OrderTrackingOrderSnapshot = {
    orderId: ORDER_ID,
    publicId: PUBLIC_ID,
    paymentStatus: "approved",
    fulfillmentStatus: "shipped",
    customerName: "Maria",
    shippingCity: "São Paulo",
    shippingState: "SP",
    trackingCode: "AB123456789BR",
    paidAt: "2026-09-25T13:15:00.000Z",
    shippedAt: "2026-09-25T17:32:00.000Z",
    preparingStartedAt: "2026-09-25T14:02:00.000Z",
    items: [{ id: "item-1", sku: PHYSICAL_SKU, title: "Livro", quantity: 1 }],
    digitalDeliveries: [],
  };

  return {
    accessRows,
    issuedRawTokens,
    async insertAccess({ orderId, tokenHash }) {
      const id = `access-${nextId}`;
      nextId += 1;
      accessRows.push({
        id,
        orderId,
        tokenHash,
        revokedAt: null,
        createdAt: new Date().toISOString(),
      });
      return { kind: "inserted", id };
    },
    async findAccessByTokenHash(tokenHash) {
      return accessRows.find((row) => row.tokenHash === tokenHash) ?? null;
    },
    async findOrderSnapshot(orderId) {
      return order.orderId === orderId ? order : null;
    },
    async orderHasPhysicalItem(orderId) {
      return orderId === ORDER_ID;
    },
  };
}

test("ensure + unique conflict devolve a mesma row", async () => {
  const store = memoryStore();
  const first = await ensureOrderEmailNotification(ORDER_ID, "admin_physical_sale", store);
  const second = await ensureOrderEmailNotification(ORDER_ID, "admin_physical_sale", store);
  assert.equal("notificationId" in first && "notificationId" in second, true);
  if ("notificationId" in first && "notificationId" in second) {
    assert.equal(first.notificationId, second.notificationId);
  }
  assert.equal(store.rows.length, 1);
});

test("claim concorrente: segundo perde a race", async () => {
  const store = memoryStore();
  const ensured = await ensureOrderEmailNotification(ORDER_ID, "admin_physical_sale", store);
  assert.equal("notificationId" in ensured, true);
  if (!("notificationId" in ensured)) {
    return;
  }
  const a = await claimOrderEmailForSend(ensured.notificationId, store, NOW);
  const b = await claimOrderEmailForSend(ensured.notificationId, store, NOW);
  assert.equal(a.status, "claimed");
  assert.equal(b.status, "already_sending");
});

test("notifyAdminPhysicalSale envia uma vez e segundo é already_sent", async () => {
  const store = memoryStore();
  let sends = 0;
  const first = await notifyAdminPhysicalSale(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "m1" };
    },
  });
  const second = await notifyAdminPhysicalSale(ORDER_ID, store, {
    nowMs: NOW + 1,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "m2" };
    },
  });
  assert.equal(first.status, "sent");
  assert.equal(second.status, "already_sent");
  assert.equal(sends, 1);
  assert.equal(store.rows[0]?.status, "sent");
  assert.equal(
    store.events.some((e) => e.type === "admin_physical_sale_email_sent"),
    true,
  );
});

test("notifyAdminPhysicalSale ignora pedido só e-book", async () => {
  const store = memoryStore({
    adminContext: {
      orderId: ORDER_ID,
      publicId: PUBLIC_ID,
      paymentStatus: "approved",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      totalCents: 1990,
      paidAt: "2026-09-23T12:00:00.000Z",
      shippingZip: null,
      shippingStreet: null,
      shippingNumber: null,
      shippingComplement: null,
      shippingDistrict: null,
      shippingCity: null,
      shippingState: null,
      items: [{ sku: DIGITAL_SKU, quantity: 1, title: "E-book" }],
    },
  });
  const result = await notifyAdminPhysicalSale(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => {
      throw new Error("should_not_send");
    },
  });
  assert.equal(result.status, "skipped");
  if (result.status === "skipped") {
    assert.equal(result.reason, "no_physical_item");
  }
  assert.equal(store.rows.length, 0);
});

test("falha Resend marca failed e não inventa sent", async () => {
  const store = memoryStore();
  const result = await notifyAdminPhysicalSale(ORDER_ID, store, {
    nowMs: NOW,
    sendEmail: async () => ({ ok: false, code: "EMAIL_SEND_FAILED" }),
  });
  assert.equal(result.status, "failed");
  assert.equal(store.rows[0]?.status, "failed");
  assert.equal(
    store.events.some((e) => e.type === "admin_physical_sale_email_failed"),
    true,
  );
  assert.doesNotThrow(() => assertNoSensitiveFields(result));
});

test("buyer_order_confirmed é idempotente e cria autorização", async () => {
  const emailStore = memoryStore();
  const trackingStore = memoryTrackingStore();
  const urls: string[] = [];
  const first = await notifyBuyerOrderConfirmed(ORDER_ID, emailStore, trackingStore, {
    nowMs: NOW,
    env: { APP_URL },
    sendEmail: async (_ctx, url) => {
      urls.push(url);
      return { ok: true, providerMessageId: "m1" };
    },
  });
  const second = await notifyBuyerOrderConfirmed(ORDER_ID, emailStore, trackingStore, {
    nowMs: NOW + 1,
    env: { APP_URL },
    sendEmail: async (_ctx, url) => {
      urls.push(url);
      return { ok: true, providerMessageId: "m2" };
    },
  });
  assert.equal(first.status, "sent");
  assert.equal(second.status, "already_sent");
  assert.equal(urls.length, 1);
  assert.equal(trackingStore.accessRows.length, 1);
  assert.equal(urls[0]?.includes("/pedido/acompanhar/"), true);
});

test("buyer_order_confirmed ignora digital-only", async () => {
  const emailStore = memoryStore({
    confirmedContext: {
      orderId: ORDER_ID,
      publicId: PUBLIC_ID,
      paymentStatus: "approved",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      totalCents: 1990,
      items: [{ sku: DIGITAL_SKU, quantity: 1, title: "E-book" }],
    },
  });
  const trackingStore = memoryTrackingStore();
  const result = await notifyBuyerOrderConfirmed(ORDER_ID, emailStore, trackingStore, {
    nowMs: NOW,
    env: { APP_URL },
    sendEmail: async () => {
      throw new Error("should_not_send");
    },
  });
  assert.equal(result.status, "skipped");
  assert.equal(trackingStore.accessRows.length, 0);
});

test("notifyBuyerShipped inclui tracking+link e preserva auth anterior", async () => {
  const emailStore = memoryStore();
  const trackingStore = memoryTrackingStore();

  const prior = await createOrderTrackingAccess(ORDER_ID, trackingStore);
  assert.equal(prior.status, "created");
  if (prior.status !== "created") {
    return;
  }

  let shippedUrl = "";
  const first = await notifyBuyerShipped(ORDER_ID, emailStore, {
    nowMs: NOW,
    env: { APP_URL },
    trackingStore,
    sendEmail: async (_ctx, url) => {
      shippedUrl = url;
      return { ok: true, providerMessageId: "m1" };
    },
  });
  assert.equal(first.status, "sent");
  assert.equal(shippedUrl.includes("/pedido/acompanhar/"), true);
  assert.equal(trackingStore.accessRows.length, 2);
  assert.equal(trackingStore.accessRows.every((row) => row.revokedAt === null), true);

  const priorStillValid = await resolveOrderTracking(prior.rawToken, trackingStore);
  assert.equal(priorStillValid.ok, true);

  const second = await notifyBuyerShipped(ORDER_ID, emailStore, {
    nowMs: NOW + 1,
    env: { APP_URL },
    trackingStore,
    sendEmail: async () => ({ ok: true, providerMessageId: "m2" }),
  });
  assert.equal(second.status, "already_sent");
  assert.equal(trackingStore.accessRows.length, 2);
});

test("notifyBuyerShipped é idempotente e exige shipped", async () => {
  const store = memoryStore();
  const trackingStore = memoryTrackingStore();
  let sends = 0;
  const first = await notifyBuyerShipped(ORDER_ID, store, {
    nowMs: NOW,
    env: { APP_URL },
    trackingStore,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "m1" };
    },
  });
  const second = await notifyBuyerShipped(ORDER_ID, store, {
    nowMs: NOW + 1,
    env: { APP_URL },
    trackingStore,
    sendEmail: async () => {
      sends += 1;
      return { ok: true, providerMessageId: "m2" };
    },
  });
  assert.equal(first.status, "sent");
  assert.equal(second.status, "already_sent");
  assert.equal(sends, 1);

  const notShipped = memoryStore({
    buyerContext: {
      orderId: ORDER_ID,
      publicId: PUBLIC_ID,
      paymentStatus: "approved",
      fulfillmentStatus: "preparing",
      customerEmail: "maria@example.com",
      customerName: "Maria",
      trackingCode: null,
      shippedAt: null,
      items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
    },
  });
  const skipped = await notifyBuyerShipped(ORDER_ID, notShipped, {
    nowMs: NOW,
    env: { APP_URL },
    trackingStore: memoryTrackingStore(),
    sendEmail: async () => ({ ok: true, providerMessageId: null }),
  });
  assert.equal(skipped.status, "skipped");
});

test("falha no e-mail de postagem marca failed sem depender de status shipped no store de e-mail", async () => {
  const store = memoryStore();
  const trackingStore = memoryTrackingStore();
  const result = await notifyBuyerShipped(ORDER_ID, store, {
    nowMs: NOW,
    env: { APP_URL },
    trackingStore,
    sendEmail: async () => ({ ok: false, code: "EMAIL_SEND_FAILED" }),
  });
  assert.equal(result.status, "failed");
  assert.equal(store.rows[0]?.status, "failed");
  const ctx = await store.findBuyerShippedContext(ORDER_ID);
  assert.equal(ctx?.fulfillmentStatus, "shipped");
});
