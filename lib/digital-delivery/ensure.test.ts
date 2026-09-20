import assert from "node:assert/strict";
import { test } from "node:test";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import { ensureDigitalDeliveries } from "@/lib/digital-delivery/ensure";
import { hashDigitalDeliveryToken } from "@/lib/digital-delivery/token";
import type {
  DigitalDeliveryOrder,
  DigitalDeliveryOrderItem,
  DigitalDeliveryProduct,
  DigitalDeliveryStore,
  InsertDigitalDeliveryInput,
} from "@/lib/digital-delivery/types";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import type { OrderPaymentStatus } from "@/lib/payments/status";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ORDER_ID = "22222222-2222-4222-8222-222222222222";
const PHYSICAL_ITEM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DIGITAL_ITEM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FOREIGN_ITEM_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PHYSICAL_PRODUCT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const DIGITAL_PRODUCT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

type DeliveryRow = InsertDigitalDeliveryInput & { id: string };

function digitalProduct(overrides?: Partial<DigitalDeliveryProduct>): DigitalDeliveryProduct {
  return {
    id: DIGITAL_PRODUCT_ID,
    type: "digital",
    digitalFilePath: "a-vida-e-um-dia-ebook.pdf",
    ...overrides,
  };
}

function physicalProduct(): DigitalDeliveryProduct {
  return {
    id: PHYSICAL_PRODUCT_ID,
    type: "physical",
    digitalFilePath: null,
  };
}

function physicalItem(orderId = ORDER_ID): DigitalDeliveryOrderItem {
  return {
    id: PHYSICAL_ITEM_ID,
    orderId,
    productId: PHYSICAL_PRODUCT_ID,
    sku: PHYSICAL_SKU,
  };
}

function digitalItem(orderId = ORDER_ID): DigitalDeliveryOrderItem {
  return {
    id: DIGITAL_ITEM_ID,
    orderId,
    productId: DIGITAL_PRODUCT_ID,
    sku: DIGITAL_SKU,
  };
}

function memoryStore(seed: {
  paymentStatus?: OrderPaymentStatus;
  fulfillmentStatus?: string;
  items?: DigitalDeliveryOrderItem[];
  products?: DigitalDeliveryProduct[];
  order?: DigitalDeliveryOrder | null;
}): DigitalDeliveryStore & {
  deliveries: DeliveryRow[];
  fulfillmentStatus: string;
  insertCalls: number;
} {
  const order: DigitalDeliveryOrder | null =
    seed.order === undefined
      ? {
          id: ORDER_ID,
          paymentStatus: seed.paymentStatus ?? "approved",
          fulfillmentStatus: seed.fulfillmentStatus ?? "pending",
        }
      : seed.order;
  const items = seed.items ?? [];
  const products = new Map((seed.products ?? []).map((product) => [product.id, product]));
  const byItem = new Map<string, DeliveryRow>();
  const deliveries: DeliveryRow[] = [];
  let insertCalls = 0;
  let chain = Promise.resolve();

  const store: DigitalDeliveryStore & {
    deliveries: DeliveryRow[];
    fulfillmentStatus: string;
    insertCalls: number;
  } = {
    get deliveries() {
      return deliveries;
    },
    get fulfillmentStatus() {
      return order?.fulfillmentStatus ?? seed.fulfillmentStatus ?? "pending";
    },
    get insertCalls() {
      return insertCalls;
    },
    findOrderById: async (orderId) => {
      if (!order || order.id !== orderId) {
        return null;
      }
      return { ...order };
    },
    listOrderItems: async (orderId) => items.filter((item) => item.orderId === orderId).map((item) => ({ ...item })),
    findProductById: async (productId) => {
      const product = products.get(productId);
      return product ? { ...product } : null;
    },
    insertDelivery: (input) => {
      const run = chain.then(async () => {
        insertCalls += 1;
        await Promise.resolve();
        if (byItem.has(input.orderItemId)) {
          return { kind: "conflict" as const };
        }
        const row = { ...input, id: `delivery-${byItem.size + 1}` };
        byItem.set(input.orderItemId, row);
        deliveries.push(row);
        return { kind: "inserted" as const };
      });
      chain = run.then(() => undefined);
      return run;
    },
  };

  return store;
}

test("pedido físico approved não cria delivery", async () => {
  const store = memoryStore({
    items: [physicalItem()],
    products: [physicalProduct()],
  });
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(store.deliveries.length, 0);
  assert.equal(result.items.every((item) => item.status === "skipped"), true);
  assert.equal(store.fulfillmentStatus, "pending");
});

test("e-book approved cria uma delivery", async () => {
  const store = memoryStore({
    items: [digitalItem()],
    products: [digitalProduct()],
  });
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(store.deliveries.length, 1);
  assert.equal(result.items.filter((item) => item.status === "created").length, 1);
  assert.equal(store.deliveries[0].orderItemId, DIGITAL_ITEM_ID);
  assert.equal(store.deliveries[0].productId, DIGITAL_PRODUCT_ID);
  assert.equal(store.fulfillmentStatus, "pending");
});

test("físico + e-book approved cria uma delivery", async () => {
  const store = memoryStore({
    items: [physicalItem(), digitalItem()],
    products: [physicalProduct(), digitalProduct()],
  });
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(store.deliveries.length, 1);
  assert.equal(result.items.filter((item) => item.status === "created").length, 1);
  assert.equal(result.items.filter((item) => item.status === "skipped").length, 1);
  assert.equal(store.fulfillmentStatus, "pending");
});

test("pedido pending com e-book não cria delivery", async () => {
  const store = memoryStore({
    paymentStatus: "pending",
    items: [digitalItem()],
    products: [digitalProduct()],
  });
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(store.deliveries.length, 0);
  assert.equal(store.insertCalls, 0);
  assert.equal(result.items[0]?.status, "skipped");
  assert.equal(result.items[0] && "reason" in result.items[0] ? result.items[0].reason : null, "payment_not_approved");
});

test("ensure duplicado não rotaciona token nem cria segundo registro", async () => {
  const store = memoryStore({
    items: [digitalItem()],
    products: [digitalProduct()],
  });
  const first = await ensureDigitalDeliveries(ORDER_ID, store);
  const hash = store.deliveries[0]?.tokenHash;
  const second = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(first.items[0]?.status, "created");
  assert.equal(second.items[0]?.status, "already_exists");
  assert.equal(store.deliveries.length, 1);
  assert.equal(store.deliveries[0]?.tokenHash, hash);
  assert.equal("rawToken" in (second.items[0] ?? {}), false);
});

test("dois ensures concorrentes respeitam UNIQUE e tratam conflito", async () => {
  const store = memoryStore({
    items: [digitalItem()],
    products: [digitalProduct()],
  });
  const [first, second] = await Promise.all([
    ensureDigitalDeliveries(ORDER_ID, store),
    ensureDigitalDeliveries(ORDER_ID, store),
  ]);
  const statuses = [...first.items, ...second.items].map((item) => item.status).sort();
  assert.deepEqual(statuses, ["already_exists", "created"]);
  assert.equal(store.deliveries.length, 1);
  const created = [...first.items, ...second.items].find((item) => item.status === "created");
  const existing = [...first.items, ...second.items].find((item) => item.status === "already_exists");
  assert.equal(created && "rawToken" in created, true);
  assert.equal(existing && "rawToken" in existing, false);
});

test("produto digital sem digital_file_path não libera", async () => {
  const store = memoryStore({
    items: [digitalItem()],
    products: [digitalProduct({ digitalFilePath: "  " })],
  });
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(store.deliveries.length, 0);
  assert.equal(result.items[0]?.status, "skipped");
  assert.equal(result.items[0] && "reason" in result.items[0] ? result.items[0].reason : null, "missing_digital_file_path");
});

test("item que não pertence ao pedido não libera", async () => {
  const store = memoryStore({
    items: [{ ...digitalItem(OTHER_ORDER_ID), id: FOREIGN_ITEM_ID }],
    products: [digitalProduct()],
  });
  store.listOrderItems = async () => [{ ...digitalItem(OTHER_ORDER_ID), id: FOREIGN_ITEM_ID }];
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(store.deliveries.length, 0);
  assert.equal(result.items[0]?.status, "skipped");
  assert.equal(result.items[0] && "reason" in result.items[0] ? result.items[0].reason : null, "item_order_mismatch");
});

test("token persistido é SHA-256 e o bruto não é armazenado", async () => {
  const store = memoryStore({
    items: [digitalItem()],
    products: [digitalProduct()],
  });
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  const created = result.items[0];
  assert.equal(created?.status, "created");
  if (created?.status !== "created") {
    throw new Error("expected created");
  }
  assert.equal(store.deliveries[0]?.tokenHash, hashDigitalDeliveryToken(created.rawToken));
  assert.match(store.deliveries[0]?.tokenHash ?? "", /^[a-f0-9]{64}$/);
  const persisted = JSON.stringify(store.deliveries);
  assert.equal(persisted.includes(created.rawToken), false);
  assert.equal("rawToken" in store.deliveries[0], false);
  assert.equal(persisted.includes("signed"), false);
  assert.equal(persisted.includes("a-vida-e-um-dia-ebook.pdf"), false);
});

test("ensure não altera fulfillment_status", async () => {
  const store = memoryStore({
    fulfillmentStatus: "preparing",
    items: [digitalItem()],
    products: [digitalProduct()],
  });
  await ensureDigitalDeliveries(ORDER_ID, store);
  assert.equal(store.fulfillmentStatus, "preparing");
  assert.equal(store.deliveries.length, 1);
});

test("resultado created contém token interno mas não vaza em payload sanitizado de eventos", async () => {
  const store = memoryStore({
    items: [digitalItem()],
    products: [digitalProduct()],
  });
  const result = await ensureDigitalDeliveries(ORDER_ID, store);
  const created = result.items[0];
  assert.equal(created?.status, "created");
  const publicSummary = {
    created: result.items.filter((item) => item.status === "created").length,
    already_exists: result.items.filter((item) => item.status === "already_exists").length,
  };
  assert.doesNotThrow(() => assertNoSensitiveFields(publicSummary));
});
