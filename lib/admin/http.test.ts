import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { AdminAccess } from "@/lib/admin/access";
import { handleAdminOrderDetail, handleAdminOrderList } from "@/lib/admin/http";
import type { AdminOrderDetail, AdminOrderListItem } from "@/lib/admin/orders";

const ORDER_ID = "22222222-2222-4222-8222-222222222222";

function listItem(): AdminOrderListItem {
  return {
    id: ORDER_ID,
    friendlyCode: "#A1B2C3D4",
    createdAt: "2026-09-22T18:00:00.000Z",
    buyerName: "Ana",
    physicalQuantity: 1,
    hasEbook: true,
    totalCents: 6490,
    paymentStatus: "approved",
    fulfillmentStatus: "pending",
  };
}

function detail(): AdminOrderDetail {
  return {
    ...listItem(),
    paidAt: "2026-09-22T18:05:00.000Z",
    email: "ana@example.com",
    phone: "11987654321",
    document: "12345678909",
    zip: "01310100",
    street: "Rua da Consolação",
    number: "10",
    complement: null,
    district: "Consolação",
    city: "São Paulo",
    state: "SP",
    subtotalCents: 5980,
    discountCents: 990,
    shippingCents: 1500,
    items: [],
  };
}

function access(result: AdminAccess) {
  return async () => result;
}

test("API de listagem não consulta pedidos sem autenticação", async () => {
  let listed = false;
  const response = await handleAdminOrderList(new Request("http://localhost/api/admin/orders"), {
    resolveAccess: access({ ok: false, reason: "anonymous" }),
    listPhysicalOrders: async () => {
      listed = true;
      return { total: 1, page: 1, pageSize: 20, orders: [listItem()] };
    },
  });

  assert.equal(response.status, 401);
  assert.equal(listed, false);
  const body = await response.json();
  assert.deepEqual(body, { ok: false, code: "UNAUTHENTICATED" });
  assert.equal(JSON.stringify(body).includes("Ana"), false);
});

test("API de listagem nega usuário autenticado que não é admin", async () => {
  let listed = false;
  const response = await handleAdminOrderList(new Request("http://localhost/api/admin/orders"), {
    resolveAccess: access({ ok: false, reason: "forbidden" }),
    listPhysicalOrders: async () => {
      listed = true;
      return { total: 0, page: 1, pageSize: 20, orders: [] };
    },
  });

  assert.equal(response.status, 403);
  assert.equal(listed, false);
  assert.deepEqual(await response.json(), { ok: false, code: "FORBIDDEN" });
});

test("API de listagem do admin pede a página certa e não devolve contato", async () => {
  const seen: number[] = [];
  const response = await handleAdminOrderList(
    new Request("http://localhost/api/admin/orders?page=2"),
    {
      resolveAccess: access({ ok: true, userId: "11111111-1111-4111-8111-111111111111" }),
      listPhysicalOrders: async (page) => {
        seen.push(page);
        return { total: 21, page, pageSize: 20, orders: [listItem()] };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(seen, [2]);
  const body = await response.json();
  assert.equal(body.orders[0].friendlyCode, "#A1B2C3D4");
  assert.equal(body.orders[0].hasEbook, true);
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes("email"), false);
  assert.equal(serialized.includes("document"), false);
  assert.equal(serialized.includes("phone"), false);
  assert.equal(serialized.includes("street"), false);
});

test("API de detalhe não busca o pedido sem autenticação", async () => {
  let lookedUp = false;
  const response = await handleAdminOrderDetail(ORDER_ID, {
    resolveAccess: access({ ok: false, reason: "anonymous" }),
    findPhysicalOrder: async () => {
      lookedUp = true;
      return detail();
    },
  });

  assert.equal(response.status, 401);
  assert.equal(lookedUp, false);
  const serialized = JSON.stringify(await response.json());
  assert.equal(serialized.includes("ana@example.com"), false);
  assert.equal(serialized.includes("12345678909"), false);
});

test("API de detalhe do admin devolve o pedido autorizado", async () => {
  const response = await handleAdminOrderDetail(ORDER_ID, {
    resolveAccess: access({ ok: true, userId: "11111111-1111-4111-8111-111111111111" }),
    findPhysicalOrder: async (id) => (id === ORDER_ID ? detail() : null),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.order.id, ORDER_ID);
  assert.equal(body.order.email, "ana@example.com");
  assert.equal(body.order.hasEbook, true);
});

test("rotas administrativas e a guarda não passam pela leitura pública de pagamento", () => {
  const files = [
    ["app", "api", "admin", "orders", "route.ts"],
    ["app", "api", "admin", "orders", "[id]", "route.ts"],
    ["lib", "admin", "guard.ts"],
    ["lib", "admin", "auth-api.ts"],
    ["lib", "admin", "order-store.ts"],
    ["lib", "payments", "handle-webhook.ts"],
    ["lib", "payments", "reconcile-order.ts"],
    ["lib", "digital-delivery", "fulfill-approved-order.ts"],
    ["lib", "digital-delivery", "ebook-email.ts"],
    ["app", "api", "orders", "[publicId]", "payment-status", "route.ts"],
  ].map((parts) => readFileSync(join(process.cwd(), ...parts), "utf8"));

  const [listRoute, detailRoute, guard, authApi, store, webhook, reconcile, fulfill, email, payment] =
    files;

  assert.equal(listRoute?.includes("handleAdminOrderList"), true);
  assert.equal(listRoute?.includes("resolveAdminAccess"), true);
  assert.equal(detailRoute?.includes("handleAdminOrderDetail"), true);
  assert.equal(guard?.includes("admin_users"), true);
  assert.equal(guard?.includes("fetchAuthUserId"), true);
  assert.equal(authApi?.includes("SUPABASE_SECRET_KEY"), false);
  assert.equal(authApi?.includes("SUPABASE_PUBLISHABLE_KEY"), true);
  assert.equal(store?.includes("list_admin_physical_orders"), true);
  assert.equal(webhook?.includes("lib/admin"), false);
  assert.equal(reconcile?.includes("fulfillment_status"), false);
  assert.equal(fulfill?.includes("lib/admin"), false);
  assert.equal(email?.includes("lib/admin"), false);
  assert.equal(payment?.includes("lib/admin"), false);
  assert.equal(payment?.includes("getPublicPaymentStatus"), true);
});
