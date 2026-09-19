import assert from "node:assert/strict";
import { test } from "node:test";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import {
  OFFICIAL_PIX_TEST_ORDER_BODY,
  authorizeDebugPixRequest,
  runOfficialPixDiagnostic,
} from "@/lib/payments/debug-pix-official-test";

const DEBUG_SECRET = "debug-secret-value";
const TEST_TOKEN = "TEST-abc";
const PROD_TOKEN = "APP_USR-abc";

function request(authorization?: string) {
  return new Request("https://www.robsonsantiago.com.br/api/debug/mercado-pago-pix", {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
  });
}

test("payload oficial de Pix não inclui campos extras do checkout", () => {
  assert.deepEqual(OFFICIAL_PIX_TEST_ORDER_BODY, {
    type: "online",
    external_reference: "ext_ref_1234",
    total_amount: "50.00",
    payer: {
      email: "test_user_br@testuser.com",
      first_name: "APRO",
    },
    transactions: {
      payments: [
        {
          amount: "50.00",
          payment_method: {
            id: "pix",
            type: "bank_transfer",
          },
        },
      ],
    },
  });
  assert.equal("processing_mode" in OFFICIAL_PIX_TEST_ORDER_BODY, false);
  assert.equal("description" in OFFICIAL_PIX_TEST_ORDER_BODY, false);
  assert.equal("last_name" in OFFICIAL_PIX_TEST_ORDER_BODY.payer, false);
  assert.equal("identification" in OFFICIAL_PIX_TEST_ORDER_BODY.payer, false);
});

test("sem DEBUG_MERCADO_PAGO_SECRET não chama Mercado Pago", async () => {
  const result = authorizeDebugPixRequest(request(`Bearer ${DEBUG_SECRET}`), {
    MERCADO_PAGO_ACCESS_TOKEN: TEST_TOKEN,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "DEBUG_NOT_CONFIGURED");
  }
});

test("secret inválido não chama Mercado Pago", async () => {
  const result = authorizeDebugPixRequest(request("Bearer wrong"), {
    DEBUG_MERCADO_PAGO_SECRET: DEBUG_SECRET,
    MERCADO_PAGO_ACCESS_TOKEN: TEST_TOKEN,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 401);
  }
});

test("Access Token ausente não chama Mercado Pago", () => {
  const result = authorizeDebugPixRequest(request(`Bearer ${DEBUG_SECRET}`), {
    DEBUG_MERCADO_PAGO_SECRET: DEBUG_SECRET,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 503);
    assert.equal(result.body.error, "MERCADO_PAGO_NOT_CONFIGURED");
  }
});

test("APP_USR- + secret válido é autorizado no diagnóstico", () => {
  const result = authorizeDebugPixRequest(request(`Bearer ${DEBUG_SECRET}`), {
    DEBUG_MERCADO_PAGO_SECRET: DEBUG_SECRET,
    MERCADO_PAGO_ACCESS_TOKEN: PROD_TOKEN,
  });
  assert.equal(result.ok, true);
});

test("secret válido cria a Order mínima e consulta depois da espera", async () => {
  const calls: Array<{ url: string; method: string; body: string | null }> = [];
  const result = await runOfficialPixDiagnostic(
    request(`Bearer ${DEBUG_SECRET}`),
    {
      DEBUG_MERCADO_PAGO_SECRET: DEBUG_SECRET,
      MERCADO_PAGO_ACCESS_TOKEN: PROD_TOKEN,
    },
    {
      waitMs: 1,
      sleep: async () => {},
      fetchImpl: async (input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        const body = typeof init?.body === "string" ? init.body : null;
        calls.push({ url, method, body });
        if (method === "POST") {
          return Response.json(
            {
              id: "ORDTESTDEBUG1",
              status: "action_required",
              status_detail: "waiting_transfer",
              transactions: {
                payments: [
                  {
                    id: "PAYTESTDEBUG1",
                    status: "action_required",
                    status_detail: "waiting_transfer",
                  },
                ],
              },
            },
            { status: 201 },
          );
        }
        return Response.json(
          {
            id: "ORDTESTDEBUG1",
            status: "processed",
            status_detail: "accredited",
            transactions: {
              payments: [
                {
                  id: "PAYTESTDEBUG1",
                  status: "processed",
                  status_detail: "accredited",
                },
              ],
            },
          },
          { status: 200 },
        );
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.method, "POST");
  assert.equal(calls[0]?.url, "https://api.mercadopago.com/v1/orders");
  assert.deepEqual(JSON.parse(calls[0]?.body ?? "{}"), OFFICIAL_PIX_TEST_ORDER_BODY);
  assert.equal(calls[1]?.method, "GET");
  assert.equal(calls[1]?.url, "https://api.mercadopago.com/v1/orders/ORDTESTDEBUG1");
  if (result.ok) {
    assert.equal(result.body.create.orderId, "ORDTESTDEBUG1");
    assert.equal(result.body.create.orderStatus, "action_required");
    assert.equal(result.body.create.paymentStatusDetail, "waiting_transfer");
    assert.equal(result.body.afterWait.orderStatus, "processed");
    assert.equal(result.body.afterWait.paymentStatusDetail, "accredited");
    assert.doesNotThrow(() => assertNoSensitiveFields(result.body));
  }
});
