import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import {
  getPublicPaymentStatus,
  parsePublicOrderId,
} from "@/lib/payments/public-payment-status";

const PUBLIC_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const INTERNAL_ORDER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function store(paymentStatus: string | null, lookups: string[] = []) {
  return {
    findOrderByPublicId: async (publicId: string) => {
      lookups.push(publicId);
      if (paymentStatus === null) {
        return null;
      }
      return { paymentStatus };
    },
  };
}

test("UUID inválido não consulta o banco e retorna 400", async () => {
  const lookups: string[] = [];
  const result = await getPublicPaymentStatus("not-a-uuid", store("pending", lookups));
  assert.deepEqual(result, { ok: false, code: "VALIDATION_ERROR", status: 400 });
  assert.deepEqual(lookups, []);
  assert.equal(parsePublicOrderId("pedido-1"), null);
});

test("pedido inexistente retorna 404", async () => {
  const result = await getPublicPaymentStatus(PUBLIC_ID, store(null));
  assert.deepEqual(result, { ok: false, code: "ORDER_NOT_FOUND", status: 404 });
});

test("pending", async () => {
  const result = await getPublicPaymentStatus(PUBLIC_ID, store("pending"));
  assert.deepEqual(result, { ok: true, status: "pending" });
});

test("in_process", async () => {
  const result = await getPublicPaymentStatus(PUBLIC_ID, store("in_process"));
  assert.deepEqual(result, { ok: true, status: "in_process" });
});

test("approved", async () => {
  const result = await getPublicPaymentStatus(PUBLIC_ID, store("approved"));
  assert.deepEqual(result, { ok: true, status: "approved" });
});

test("rejected cancelled refunded", async () => {
  assert.deepEqual(await getPublicPaymentStatus(PUBLIC_ID, store("rejected")), {
    ok: true,
    status: "rejected",
  });
  assert.deepEqual(await getPublicPaymentStatus(PUBLIC_ID, store("cancelled")), {
    ok: true,
    status: "cancelled",
  });
  assert.deepEqual(await getPublicPaymentStatus(PUBLIC_ID, store("refunded")), {
    ok: true,
    status: "refunded",
  });
});

test("sucesso contém somente ok e status, sem campos internos ou PII", async () => {
  const lookups: string[] = [];
  const result = await getPublicPaymentStatus(PUBLIC_ID, store("approved", lookups));
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result).sort(), ["ok", "status"]);
  assert.doesNotThrow(() => assertNoSensitiveFields(result));
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("provider"), false);
  assert.equal(serialized.includes("email"), false);
  assert.equal(serialized.includes("document"), false);
  assert.equal(serialized.includes("phone"), false);
  assert.equal(serialized.includes("fulfillment"), false);
  assert.equal(serialized.includes(INTERNAL_ORDER_ID), false);
  assert.equal(serialized.includes("download"), false);
  assert.deepEqual(lookups, [PUBLIC_ID]);
});

test("handler não importa Mercado Pago", () => {
  const handler = readFileSync(
    join(process.cwd(), "lib", "payments", "public-payment-status.ts"),
    "utf8",
  );
  const route = readFileSync(
    join(process.cwd(), "app", "api", "orders", "[publicId]", "payment-status", "route.ts"),
    "utf8",
  );
  for (const source of [handler, route]) {
    assert.equal(source.includes("mercado-pago"), false);
    assert.equal(source.includes("mercadoPago"), false);
    assert.equal(source.includes("getOrder"), false);
    assert.equal(source.includes("createMercadoPago"), false);
    assert.equal(source.includes("access_token"), false);
    assert.equal(source.includes("provider_order_id"), false);
  }
  assert.equal(route.includes("findOrderByPublicId"), true);
  assert.equal(route.includes("[orderId]"), false);
});
