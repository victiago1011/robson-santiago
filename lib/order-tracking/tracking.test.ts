import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import { createOrderTrackingAccess } from "@/lib/order-tracking/create";
import {
  ORDER_TRACKING_PATH_PREFIX,
  buildOrderTrackingUrl,
  normalizeTrackingToken,
} from "@/lib/order-tracking/policy";
import { resolveOrderTracking } from "@/lib/order-tracking/resolve";
import {
  generateOrderTrackingToken,
  hashOrderTrackingToken,
} from "@/lib/order-tracking/token";
import type {
  OrderTrackingAccessRow,
  OrderTrackingOrderSnapshot,
  OrderTrackingStore,
} from "@/lib/order-tracking/types";
import { buildTrackingTimeline, toOrderTrackingPublicView } from "@/lib/order-tracking/view-model";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PUBLIC_ID = "43293fa5-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function snapshot(overrides?: Partial<OrderTrackingOrderSnapshot>): OrderTrackingOrderSnapshot {
  return {
    orderId: ORDER_ID,
    publicId: PUBLIC_ID,
    paymentStatus: "approved",
    fulfillmentStatus: "preparing",
    customerName: "Maria Silva",
    shippingCity: "São Paulo",
    shippingState: "SP",
    trackingCode: null,
    items: [{ sku: PHYSICAL_SKU, title: "A Vida é um Dia", quantity: 1 }],
    ...overrides,
  };
}

function memoryTrackingStore(seed?: {
  order?: OrderTrackingOrderSnapshot | null;
  accessRows?: OrderTrackingAccessRow[];
}): OrderTrackingStore & {
  accessRows: OrderTrackingAccessRow[];
  rawByHash: Map<string, string>;
} {
  const order = seed?.order === undefined ? snapshot() : seed.order;
  const accessRows: OrderTrackingAccessRow[] = [...(seed?.accessRows ?? [])];
  const rawByHash = new Map<string, string>();
  let nextId = accessRows.length + 1;

  return {
    accessRows,
    rawByHash,
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
      if (!order || order.orderId !== orderId) {
        return null;
      }
      return order;
    },
    async orderHasPhysicalItem(orderId) {
      const snap = await this.findOrderSnapshot(orderId);
      return Boolean(snap?.items.some((item) => item.sku === PHYSICAL_SKU));
    },
  };
}

test("token bruto é base64url e hash é SHA-256 hex", () => {
  const token = generateOrderTrackingToken();
  assert.match(token.rawToken, /^[A-Za-z0-9_-]+$/);
  assert.equal(token.tokenHash.length, 64);
  assert.match(token.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(
    token.tokenHash,
    createHash("sha256").update(token.rawToken, "utf8").digest("hex"),
  );
  assert.equal(token.tokenHash, hashOrderTrackingToken(token.rawToken));
  assert.notEqual(token.tokenHash, token.rawToken);
});

test("dois tokens diferentes para o mesmo pedido permanecem válidos", async () => {
  const store = memoryTrackingStore();
  const first = await createOrderTrackingAccess(ORDER_ID, store);
  const second = await createOrderTrackingAccess(ORDER_ID, store);
  assert.equal(first.status, "created");
  assert.equal(second.status, "created");
  if (first.status !== "created" || second.status !== "created") {
    return;
  }
  assert.notEqual(first.rawToken, second.rawToken);
  assert.equal(store.accessRows.length, 2);
  assert.equal(store.accessRows.every((row) => row.revokedAt === null), true);

  const resolvedFirst = await resolveOrderTracking(first.rawToken, store);
  const resolvedSecond = await resolveOrderTracking(second.rawToken, store);
  assert.equal(resolvedFirst.ok, true);
  assert.equal(resolvedSecond.ok, true);
});

test("token revogado e inválido devolvem NOT_FOUND", async () => {
  const store = memoryTrackingStore();
  const created = await createOrderTrackingAccess(ORDER_ID, store);
  assert.equal(created.status, "created");
  if (created.status !== "created") {
    return;
  }
  store.accessRows[0]!.revokedAt = new Date().toISOString();
  const revoked = await resolveOrderTracking(created.rawToken, store);
  assert.equal(revoked.ok, false);
  if (!revoked.ok) {
    assert.equal(revoked.code, "NOT_FOUND");
  }

  const invalid = await resolveOrderTracking("not-a-real-token", store);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.code, "NOT_FOUND");
  }
});

test("digital-only não cria tracking", async () => {
  const store = memoryTrackingStore({
    order: snapshot({
      items: [{ sku: DIGITAL_SKU, title: "E-book", quantity: 1 }],
      shippingCity: null,
      shippingState: null,
    }),
  });
  const result = await createOrderTrackingAccess(ORDER_ID, store);
  assert.equal(result.status, "skipped");
  if (result.status === "skipped") {
    assert.equal(result.reason, "no_physical_item");
  }
  assert.equal(store.accessRows.length, 0);
});

test("DTO público não contém PII proibida", () => {
  const view = toOrderTrackingPublicView(
    snapshot({
      customerName: "Maria Silva Santos",
      trackingCode: "AB123456789BR",
      fulfillmentStatus: "shipped",
    }),
  );
  assert.equal(view.firstName, "Maria");
  assert.equal(view.city, "São Paulo");
  assert.equal(view.region, "SP");
  assert.equal(view.trackingCode, "AB123456789BR");
  assert.equal(view.friendlyCode, "#43293FA5");
  assert.doesNotThrow(() => assertNoSensitiveFields(view));
  const json = JSON.stringify(view);
  assert.equal(json.includes("01310100"), false);
  assert.equal(json.includes("Av Paulista"), false);
  assert.equal(json.includes("maria@"), false);
  assert.equal(json.includes("cpf"), false);
});

test("timeline cobre pending preparing shipped delivered sem marcar Correios futuros", () => {
  const pending = buildTrackingTimeline("pending");
  assert.equal(pending.find((s) => s.id === "preparation")?.state, "current");
  assert.equal(pending.find((s) => s.id === "preparation")?.label, "Aguardando preparação");
  assert.equal(pending.find((s) => s.id === "in_transit")?.state, "upcoming");
  assert.equal(pending.find((s) => s.id === "out_for_delivery")?.state, "upcoming");

  const preparing = buildTrackingTimeline("preparing");
  assert.equal(preparing.find((s) => s.id === "preparation")?.label, "Preparando seu pedido");
  assert.equal(preparing.find((s) => s.id === "preparation")?.state, "current");

  const shipped = buildTrackingTimeline("shipped");
  assert.equal(shipped.find((s) => s.id === "posted")?.state, "current");
  assert.equal(shipped.find((s) => s.id === "in_transit")?.state, "upcoming");
  assert.equal(shipped.find((s) => s.id === "delivered")?.state, "upcoming");

  const delivered = buildTrackingTimeline("delivered");
  assert.equal(delivered.find((s) => s.id === "delivered")?.state, "done");
  assert.equal(delivered.find((s) => s.id === "in_transit")?.state, "upcoming");
  assert.equal(delivered.find((s) => s.id === "out_for_delivery")?.state, "upcoming");
});

test("normalizeTrackingToken e URL de acompanhamento", () => {
  assert.equal(normalizeTrackingToken("  abc  "), "abc");
  assert.equal(normalizeTrackingToken(""), null);
  assert.equal(
    buildOrderTrackingUrl("https://www.robsonsantiago.com.br", "tok_1"),
    `https://www.robsonsantiago.com.br${ORDER_TRACKING_PATH_PREFIX}/tok_1`,
  );
});

test("página e proxy configuram noindex e no-store", () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const pageSource = readFileSync(
    path.join(root, "app", "pedido", "acompanhar", "[token]", "page.tsx"),
    "utf8",
  );
  const proxySource = readFileSync(path.join(root, "proxy.ts"), "utf8");
  assert.equal(pageSource.includes("index: false"), true);
  assert.equal(pageSource.includes('dynamic = "force-dynamic"'), true);
  assert.equal(proxySource.includes("private, no-store"), true);
  assert.equal(proxySource.includes("noindex"), true);
  assert.equal(proxySource.includes("/pedido/acompanhar/"), true);
});
