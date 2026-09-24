import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  createOrderTrackingAccess,
  issueOrderTrackingAccess,
} from "@/lib/order-tracking/create";
import { buildCorreiosTrackingUrl, CORREIOS_TRACKING_BASE_URL } from "@/lib/order-tracking/correios-url";
import {
  ORDER_TRACKING_PATH_PREFIX,
  buildOrderTrackingUrl,
  normalizeTrackingToken,
} from "@/lib/order-tracking/policy";
import { resolveOrderTracking } from "@/lib/order-tracking/resolve";
import { createOpsOrderTrackingStore } from "@/lib/order-tracking/store-ops";
import {
  generateOrderTrackingToken,
  hashOrderTrackingToken,
} from "@/lib/order-tracking/token";
import type {
  OrderTrackingAccessRow,
  OrderTrackingOrderSnapshot,
  OrderTrackingStore,
} from "@/lib/order-tracking/types";
import {
  buildTrackingTimeline,
  formatTrackingDateTime,
  toOrderTrackingPublicView,
  toPublicDigitalDeliveryStatus,
  trackingStatusMessage,
} from "@/lib/order-tracking/view-model";
import { mapOrderTrackingSnapshot } from "@/lib/order-tracking/snapshot-map";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PUBLIC_ID = "43293fa5-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PHYSICAL_ITEM_ID = "item-physical-1";
const DIGITAL_ITEM_ID = "item-digital-1";

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
    paidAt: "2026-09-25T13:15:00.000Z",
    shippedAt: null,
    preparingStartedAt: null,
    items: [{ id: PHYSICAL_ITEM_ID, sku: PHYSICAL_SKU, title: "A Vida é um Dia", quantity: 1 }],
    digitalDeliveries: [],
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
      items: [{ id: DIGITAL_ITEM_ID, sku: DIGITAL_SKU, title: "E-book", quantity: 1 }],
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

test("pedido não aprovado não cria tracking", async () => {
  const store = memoryTrackingStore({
    order: snapshot({ paymentStatus: "pending" }),
  });
  const result = await issueOrderTrackingAccess(ORDER_ID, store);
  assert.equal(result.status, "skipped");
  if (result.status === "skipped") {
    assert.equal(result.reason, "payment_not_approved");
  }
  assert.equal(store.accessRows.length, 0);
});

test("caminho CLI ops carrega em Node sem server-only e sem credenciais", async () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const storeOpsSource = readFileSync(path.join(root, "lib", "order-tracking", "store-ops.ts"), "utf8");
  const scriptSource = readFileSync(
    path.join(root, "scripts", "issue-order-tracking-link.ts"),
    "utf8",
  );

  const importLines = (source: string) =>
    source
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("import "));

  for (const line of [...importLines(storeOpsSource), ...importLines(scriptSource)]) {
    assert.equal(line.includes("server-only"), false, line);
    assert.equal(line.includes("@/lib/supabase/server"), false, line);
    assert.equal(/@\/lib\/order-tracking\/store["']/.test(line), false, line);
  }
  assert.equal(
    importLines(scriptSource).some((line) => line.includes("@/lib/order-tracking/store-ops")),
    true,
  );

  // Importing the ops store must succeed in plain Node without secrets.
  const store = createOpsOrderTrackingStore({
    SUPABASE_URL: undefined,
    SUPABASE_SECRET_KEY: undefined,
  });
  assert.equal(typeof store.insertAccess, "function");
  assert.equal(typeof store.findOrderSnapshot, "function");

  await assert.rejects(
    () => store.findOrderSnapshot(ORDER_ID),
    (err: unknown) => err instanceof Error && err.message === "SUPABASE_NOT_CONFIGURED",
  );
});

test("issue via store ops path persiste só hash e rejeita digital/não aprovado", async () => {
  const approvedPhysical = memoryTrackingStore();
  const created = await issueOrderTrackingAccess(ORDER_ID, approvedPhysical);
  assert.equal(created.status, "created");
  if (created.status !== "created") {
    return;
  }
  assert.equal(approvedPhysical.accessRows.length, 1);
  assert.equal(approvedPhysical.accessRows[0]!.tokenHash, hashOrderTrackingToken(created.rawToken));
  assert.equal(
    approvedPhysical.accessRows.some((row) => row.tokenHash === created.rawToken),
    false,
  );
  assert.equal(JSON.stringify(approvedPhysical.accessRows).includes(created.rawToken), false);

  const notApproved = memoryTrackingStore({
    order: snapshot({ paymentStatus: "rejected" }),
  });
  const skippedPayment = await issueOrderTrackingAccess(ORDER_ID, notApproved);
  assert.equal(skippedPayment.status, "skipped");
  if (skippedPayment.status === "skipped") {
    assert.equal(skippedPayment.reason, "payment_not_approved");
  }

  const digitalOnly = memoryTrackingStore({
    order: snapshot({
      items: [{ id: DIGITAL_ITEM_ID, sku: DIGITAL_SKU, title: "E-book", quantity: 1 }],
    }),
  });
  const skippedDigital = await issueOrderTrackingAccess(ORDER_ID, digitalOnly);
  assert.equal(skippedDigital.status, "skipped");
  if (skippedDigital.status === "skipped") {
    assert.equal(skippedDigital.reason, "no_physical_item");
  }
});

test("DTO público não contém PII proibida", () => {
  const view = toOrderTrackingPublicView(
    snapshot({
      customerName: "Maria Silva Santos",
      trackingCode: "AB123456789BR",
      fulfillmentStatus: "shipped",
      shippedAt: "2026-09-25T17:32:00.000Z",
    }),
  );
  assert.equal(view.firstName, "Maria");
  assert.equal(
    toOrderTrackingPublicView(snapshot({ customerName: "VICTOR HUGO" })).firstName,
    "Victor",
  );
  assert.equal(
    toOrderTrackingPublicView(snapshot({ customerName: "josé" })).firstName,
    "José",
  );
  assert.equal(view.city, "São Paulo");
  assert.equal(view.region, "SP");
  assert.equal(view.trackingCode, "AB123456789BR");
  assert.equal(
    view.correiosTrackingUrl,
    `${CORREIOS_TRACKING_BASE_URL}?objeto=AB123456789BR`,
  );
  assert.equal(view.friendlyCode, "#43293FA5");
  assert.equal(view.statusMessage, "Seu pedido está a caminho.");
  assert.equal(view.items[0]?.kind, "physical");
  assert.equal(view.items[0]?.format, "Livro físico");
  assert.equal(view.items[0]?.digitalDeliveryStatus, undefined);
  assert.doesNotThrow(() => assertNoSensitiveFields(view));
  const json = JSON.stringify(view);
  assert.equal(json.includes("01310100"), false);
  assert.equal(json.includes("Av Paulista"), false);
  assert.equal(json.includes("maria@"), false);
  assert.equal(json.includes("cpf"), false);
  assert.equal(json.includes("token"), false);
  assert.equal(json.includes("token_hash"), false);
  assert.equal(json.includes("digital_file"), false);
  assert.equal(json.includes("order_events"), false);
  assert.equal(json.includes("paid_at"), false);
});

test("e-book no resumo usa digital_deliveries real, não só a presença do SKU", () => {
  const withoutDelivery = toOrderTrackingPublicView(
    snapshot({
      items: [
        { id: PHYSICAL_ITEM_ID, sku: PHYSICAL_SKU, title: "A Vida é um Dia", quantity: 1 },
        {
          id: DIGITAL_ITEM_ID,
          sku: DIGITAL_SKU,
          title: "A Vida é um Dia — E-book",
          quantity: 1,
        },
      ],
      digitalDeliveries: [],
    }),
  );
  const ebookPending = withoutDelivery.items.find((item) => item.kind === "digital");
  assert.equal(ebookPending?.digitalDeliveryStatus, "pending");
  assert.equal(ebookPending?.format, "E-book");

  const withSent = toOrderTrackingPublicView(
    snapshot({
      items: [
        { id: PHYSICAL_ITEM_ID, sku: PHYSICAL_SKU, title: "A Vida é um Dia", quantity: 1 },
        {
          id: DIGITAL_ITEM_ID,
          sku: DIGITAL_SKU,
          title: "A Vida é um Dia — E-book",
          quantity: 1,
        },
      ],
      digitalDeliveries: [
        {
          orderItemId: DIGITAL_ITEM_ID,
          emailStatus: "sent",
          revokedAt: null,
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    }),
  );
  assert.equal(
    withSent.items.find((item) => item.kind === "digital")?.digitalDeliveryStatus,
    "delivered",
  );

  assert.equal(
    toPublicDigitalDeliveryStatus({
      orderItemId: DIGITAL_ITEM_ID,
      emailStatus: "sending",
      revokedAt: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
    "processing",
  );
  assert.equal(
    toPublicDigitalDeliveryStatus({
      orderItemId: DIGITAL_ITEM_ID,
      emailStatus: "failed",
      revokedAt: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
    "failed",
  );
  assert.equal(trackingStatusMessage("preparing"), "Seu pedido está sendo preparado.");
  assert.equal(trackingStatusMessage("delivered"), "Seu pedido foi entregue.");
});

test("timeline pública tem exatamente 3 etapas com datas e delivered marca todas done", () => {
  const pending = buildTrackingTimeline("pending", {
    paidAt: "2026-09-25T13:15:00.000Z",
  });
  assert.equal(pending.length, 3);
  assert.deepEqual(
    pending.map((s) => s.id),
    ["payment_confirmed", "preparation", "posted"],
  );
  assert.equal(pending.find((s) => s.id === "preparation")?.state, "current");
  assert.equal(pending.find((s) => s.id === "preparation")?.label, "Aguardando preparação");
  assert.equal(pending.find((s) => s.id === "posted")?.state, "upcoming");
  assert.equal(
    pending.find((s) => s.id === "payment_confirmed")?.occurredAt,
    formatTrackingDateTime("2026-09-25T13:15:00.000Z"),
  );
  assert.equal(pending.some((s) => s.id === "in_transit"), false);
  assert.equal(pending.some((s) => s.id === "out_for_delivery"), false);
  assert.equal(pending.some((s) => s.id === "delivered"), false);

  const preparing = buildTrackingTimeline("preparing", {
    paidAt: "2026-09-25T13:15:00.000Z",
    preparingStartedAt: "2026-09-25T14:02:00.000Z",
  });
  assert.equal(preparing.find((s) => s.id === "preparation")?.label, "Preparando seu pedido");
  assert.equal(preparing.find((s) => s.id === "preparation")?.state, "current");
  assert.equal(preparing.find((s) => s.id === "payment_confirmed")?.state, "done");
  assert.equal(
    preparing.find((s) => s.id === "preparation")?.occurredAt,
    formatTrackingDateTime("2026-09-25T14:02:00.000Z"),
  );

  const shipped = buildTrackingTimeline("shipped", {
    paidAt: "2026-09-25T13:15:00.000Z",
    preparingStartedAt: "2026-09-25T14:02:00.000Z",
    shippedAt: "2026-09-25T17:32:00.000Z",
  });
  assert.equal(shipped.find((s) => s.id === "posted")?.state, "current");
  assert.equal(shipped.find((s) => s.id === "preparation")?.state, "done");
  assert.equal(
    shipped.find((s) => s.id === "posted")?.occurredAt,
    formatTrackingDateTime("2026-09-25T17:32:00.000Z"),
  );

  const delivered = buildTrackingTimeline("delivered", {
    paidAt: "2026-09-25T13:15:00.000Z",
    preparingStartedAt: "2026-09-25T14:02:00.000Z",
    shippedAt: "2026-09-25T17:32:00.000Z",
  });
  assert.equal(delivered.length, 3);
  assert.equal(delivered.every((s) => s.state === "done"), true);
  assert.equal(delivered.some((s) => s.id === "delivered"), false);
});

test("tracking code e URL Correios só após postagem; helper valida código", () => {
  assert.equal(buildCorreiosTrackingUrl(null), null);
  assert.equal(buildCorreiosTrackingUrl(""), null);
  assert.equal(buildCorreiosTrackingUrl("INVALID"), null);
  assert.equal(
    buildCorreiosTrackingUrl(" ab-123456789-br "),
    `${CORREIOS_TRACKING_BASE_URL}?objeto=AB123456789BR`,
  );

  const beforeShip = toOrderTrackingPublicView(
    snapshot({
      fulfillmentStatus: "preparing",
      trackingCode: "AB123456789BR",
    }),
  );
  assert.equal(beforeShip.trackingCode, null);
  assert.equal(beforeShip.correiosTrackingUrl, null);

  const shipped = toOrderTrackingPublicView(
    snapshot({
      fulfillmentStatus: "shipped",
      trackingCode: "AB123456789BR",
      shippedAt: "2026-09-25T17:32:00.000Z",
    }),
  );
  assert.equal(shipped.trackingCode, "AB123456789BR");
  assert.equal(
    shipped.correiosTrackingUrl,
    `${CORREIOS_TRACKING_BASE_URL}?objeto=AB123456789BR`,
  );

  const delivered = toOrderTrackingPublicView(
    snapshot({
      fulfillmentStatus: "delivered",
      trackingCode: "AB123456789BR",
      shippedAt: "2026-09-25T17:32:00.000Z",
    }),
  );
  assert.equal(delivered.trackingCode, "AB123456789BR");
  assert.equal(delivered.correiosTrackingUrl?.includes("objeto=AB123456789BR"), true);
  assert.equal(delivered.timeline.every((s) => s.state === "done"), true);
});

test("mapOrderTrackingSnapshot usa paid_at shipped_at e evento de preparação", () => {
  const mapped = mapOrderTrackingSnapshot({
    id: ORDER_ID,
    public_id: PUBLIC_ID,
    payment_status: "approved",
    fulfillment_status: "shipped",
    customer_name: "Maria",
    shipping_city: "São Paulo",
    shipping_state: "SP",
    tracking_code: "AB123456789BR",
    paid_at: "2026-09-25T13:15:00.000Z",
    shipped_at: "2026-09-25T17:32:00.000Z",
    order_items: [{ id: PHYSICAL_ITEM_ID, sku: PHYSICAL_SKU, title: "Livro", quantity: 1 }],
    digital_deliveries: [],
    order_events: [
      { event_type: "order_created", created_at: "2026-09-25T12:00:00.000Z" },
      { event_type: "fulfillment_preparing_started", created_at: "2026-09-25T15:00:00.000Z" },
      { event_type: "fulfillment_preparing_started", created_at: "2026-09-25T14:02:00.000Z" },
      { event_type: "fulfillment_shipped", created_at: "2026-09-25T17:32:00.000Z" },
    ],
  });
  assert.equal(mapped.paidAt, "2026-09-25T13:15:00.000Z");
  assert.equal(mapped.shippedAt, "2026-09-25T17:32:00.000Z");
  assert.equal(mapped.preparingStartedAt, "2026-09-25T14:02:00.000Z");
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
  assert.equal(pageSource.includes("Pagamento confirmado"), false);
  assert.equal(pageSource.includes("TrackingTimeline"), true);
  assert.equal(pageSource.includes("correiosTrackingUrl"), true);
  assert.equal(proxySource.includes("private, no-store"), true);
  assert.equal(proxySource.includes("noindex"), true);
  assert.equal(proxySource.includes("/pedido/acompanhar/"), true);
});
