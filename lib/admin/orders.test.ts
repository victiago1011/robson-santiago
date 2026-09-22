import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { DIGITAL_SKU, EBOOK_BUMP_PROMOTION_CODE, PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  friendlyOrderCode,
  fulfillmentStatusLabel,
  paginatePhysicalOrders,
  paymentStatusLabel,
  toAdminOrderDetail,
  type AdminOrderSource,
} from "@/lib/admin/orders";

const PUBLIC_ID = "a1b2c3d4-e5f6-4789-a123-456789abcdef";

function item(sku: string, quantity = 1) {
  return {
    sku,
    title: sku,
    quantity,
    unitPriceCents: sku === PHYSICAL_SKU ? 3990 : 1990,
    totalPriceCents: (sku === PHYSICAL_SKU ? 3990 : 1990) * quantity,
  };
}

function order(
  id: string,
  createdAt: string,
  items: AdminOrderSource["items"],
  extras: Partial<AdminOrderSource> = {},
): AdminOrderSource {
  return {
    id,
    publicId: PUBLIC_ID,
    createdAt,
    paidAt: null,
    buyerName: "Comprador",
    email: "comprador@example.com",
    phone: "11987654321",
    document: "12345678909",
    zip: "01310100",
    street: "Rua da Consolação",
    number: "100",
    complement: null,
    district: "Consolação",
    city: "São Paulo",
    state: "SP",
    subtotalCents: 3990,
    discountCents: 0,
    shippingCents: 1500,
    totalCents: 5490,
    paymentStatus: "approved",
    fulfillmentStatus: "pending",
    promotionCode: null,
    items,
    ...extras,
  };
}

test("código amigável usa só um trecho estável do public_id", () => {
  assert.equal(friendlyOrderCode(PUBLIC_ID), "#A1B2C3D4");
  assert.equal(friendlyOrderCode(PUBLIC_ID).includes(PUBLIC_ID), false);
});

test("rótulos de pagamento e envio não alteram o valor persistido", () => {
  assert.equal(paymentStatusLabel("pending"), "Aguardando pagamento");
  assert.equal(paymentStatusLabel("approved"), "Pago");
  assert.equal(paymentStatusLabel("rejected"), "Pagamento recusado");
  assert.equal(paymentStatusLabel("cancelled"), "Cancelado");
  assert.equal(paymentStatusLabel("refunded"), "Reembolsado");
  assert.equal(fulfillmentStatusLabel("pending"), "Aguardando preparação");
  assert.equal(fulfillmentStatusLabel("preparing"), "Preparando");
  assert.equal(fulfillmentStatusLabel("shipped"), "Postado");
  assert.equal(fulfillmentStatusLabel("delivered"), "Entregue");
  assert.equal(fulfillmentStatusLabel("cancelled"), "Cancelado");
});

test("listagem fica só com livro físico, omite e-book avulso e marca o bump pelo item", () => {
  const ebookOnly = order("00000000-0000-4000-8000-000000000001", "2026-09-03T12:00:00.000Z", [
    item(DIGITAL_SKU),
  ]);
  const physical = order("00000000-0000-4000-8000-000000000002", "2026-09-02T12:00:00.000Z", [
    item(PHYSICAL_SKU, 2),
  ]);
  const bump = order(
    "00000000-0000-4000-8000-000000000003",
    "2026-09-04T12:00:00.000Z",
    [item(PHYSICAL_SKU, 1), item(DIGITAL_SKU)],
    { promotionCode: EBOOK_BUMP_PROMOTION_CODE, discountCents: 990 },
  );
  const promotionWithoutEbook = order(
    "00000000-0000-4000-8000-000000000004",
    "2026-09-01T12:00:00.000Z",
    [item(PHYSICAL_SKU, 3)],
    { promotionCode: EBOOK_BUMP_PROMOTION_CODE },
  );

  const page = paginatePhysicalOrders(
    [ebookOnly, physical, bump, promotionWithoutEbook],
    1,
    20,
  );

  assert.deepEqual(
    page.orders.map((entry) => entry.id),
    [bump.id, physical.id, promotionWithoutEbook.id],
  );
  assert.equal(page.orders[0]?.hasEbook, true);
  assert.equal(page.orders[0]?.physicalQuantity, 1);
  assert.equal(page.orders[1]?.hasEbook, false);
  assert.equal(page.orders[1]?.physicalQuantity, 2);
  assert.equal(page.orders[2]?.hasEbook, false);
  assert.equal(JSON.stringify(page.orders).includes("comprador@example.com"), false);
  assert.equal(JSON.stringify(page.orders).includes("12345678909"), false);
});

test("paginação server-side de 20 mantém os mais recentes na primeira página", () => {
  const orders = Array.from({ length: 25 }, (_, index) => {
    const sequence = String(index + 1).padStart(12, "0");
    return order(
      `00000000-0000-4000-8000-${sequence}`,
      new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      [item(PHYSICAL_SKU, 1)],
    );
  });
  orders.push(
    order("00000000-0000-4000-8000-999999999999", "2026-12-01T00:00:00.000Z", [item(DIGITAL_SKU)]),
  );

  const first = paginatePhysicalOrders(orders, 1, ADMIN_ORDERS_PAGE_SIZE);
  const second = paginatePhysicalOrders(orders, 2, ADMIN_ORDERS_PAGE_SIZE);

  assert.equal(first.total, 25);
  assert.equal(first.orders.length, 20);
  assert.equal(first.orders[0]?.id, "00000000-0000-4000-8000-000000000025");
  assert.equal(second.orders.length, 5);
  assert.equal(second.orders[0]?.id, "00000000-0000-4000-8000-000000000005");
  assert.equal(
    second.orders.some((entry) => entry.id === "00000000-0000-4000-8000-999999999999"),
    false,
  );
});

test("detalhe devolve o pedido físico certo e esconde pedido só de e-book", () => {
  const physical = order(
    "00000000-0000-4000-8000-000000000010",
    "2026-09-10T15:00:00.000Z",
    [item(PHYSICAL_SKU, 2), item(DIGITAL_SKU)],
    { paidAt: "2026-09-10T15:04:00.000Z", promotionCode: EBOOK_BUMP_PROMOTION_CODE },
  );
  const detail = toAdminOrderDetail(physical);
  assert.equal(detail?.id, physical.id);
  assert.equal(detail?.friendlyCode, "#A1B2C3D4");
  assert.equal(detail?.hasEbook, true);
  assert.equal(detail?.physicalQuantity, 2);
  assert.equal(detail?.email, physical.email);
  assert.equal(detail?.paidAt, physical.paidAt);
  assert.equal(detail?.street, "Rua da Consolação");

  assert.equal(
    toAdminOrderDetail(
      order("00000000-0000-4000-8000-000000000011", "2026-09-11T15:00:00.000Z", [
        item(DIGITAL_SKU),
      ]),
    ),
    null,
  );
});

test("migration pagina no banco só pedidos com AVIDA-FISICO e não cria administrador", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase", "migrations", "20260922181500_add_admin_users.sql"),
    "utf8",
  );
  assert.equal(sql.includes("create table public.admin_users"), true);
  assert.equal(sql.includes("references auth.users (id)"), true);
  assert.equal(sql.includes("sku = 'AVIDA-FISICO'"), true);
  assert.equal(sql.includes("sku = 'AVIDA-EBOOK'"), true);
  assert.equal(sql.includes("limit p_limit"), true);
  assert.equal(sql.includes("offset p_offset"), true);
  assert.equal(sql.toLowerCase().includes("insert into public.admin_users"), false);
  assert.equal(sql.toLowerCase().includes("password"), false);
  assert.equal(sql.includes("customer_email"), false);
});
