import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADMIN_PHYSICAL_SALE_EMAIL_SUBJECT,
  ADMIN_PHYSICAL_SALE_EMAIL_TO,
  buildAdminPhysicalSaleEmail,
  sendAdminPhysicalSaleEmail,
} from "@/lib/notifications/admin-physical-sale-email";
import {
  BUYER_SHIPPED_EMAIL_SUBJECT,
  buildBuyerShippedEmail,
  sendBuyerShippedEmail,
} from "@/lib/notifications/buyer-shipped-email";
import type { EmailSendPayload } from "@/lib/digital-delivery/ebook-email";
import type {
  AdminPhysicalSaleOrderContext,
  BuyerShippedOrderContext,
} from "@/lib/notifications/types";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import { DEFAULT_RESEND_FROM } from "@/lib/email/config";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PUBLIC_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const APP_URL = "https://www.robsonsantiago.com.br";
const API_KEY = "re_test_placeholder_key";

function adminCtx(
  overrides?: Partial<AdminPhysicalSaleOrderContext>,
): AdminPhysicalSaleOrderContext {
  return {
    orderId: ORDER_ID,
    publicId: PUBLIC_ID,
    paymentStatus: "approved",
    customerName: "Maria Silva",
    customerEmail: "maria@example.com",
    totalCents: 6490,
    paidAt: "2026-09-23T12:00:00.000Z",
    shippingZip: "01310100",
    shippingStreet: "Av Paulista",
    shippingNumber: "1000",
    shippingComplement: "Apto 1",
    shippingDistrict: "Bela Vista",
    shippingCity: "São Paulo",
    shippingState: "SP",
    items: [
      { sku: PHYSICAL_SKU, quantity: 2, title: "A Vida é um Dia" },
      { sku: DIGITAL_SKU, quantity: 1, title: "E-book" },
    ],
    ...overrides,
  };
}

function buyerCtx(overrides?: Partial<BuyerShippedOrderContext>): BuyerShippedOrderContext {
  return {
    orderId: ORDER_ID,
    publicId: PUBLIC_ID,
    paymentStatus: "approved",
    fulfillmentStatus: "shipped",
    customerEmail: "maria@example.com",
    customerName: "Maria Silva",
    trackingCode: "AB123456789BR",
    shippedAt: "2026-09-23T15:00:00.000Z",
    items: [{ sku: PHYSICAL_SKU, quantity: 1 }],
    ...overrides,
  };
}

function env(overrides?: NodeJS.Dict<string>): NodeJS.Dict<string> {
  return {
    RESEND_API_KEY: API_KEY,
    APP_URL,
    ...overrides,
  };
}

function captureSend() {
  const captured: { payload: EmailSendPayload | null } = { payload: null };
  return {
    captured,
    send: async (payload: EmailSendPayload) => {
      captured.payload = payload;
      return { ok: true as const, providerMessageId: "msg_1" };
    },
  };
}

test("template admin inclui campos operacionais e CTA do pedido", () => {
  const content = buildAdminPhysicalSaleEmail(
    adminCtx(),
    `${APP_URL}/admin/pedidos/${ORDER_ID}`,
  );
  assert.equal(content.subject, ADMIN_PHYSICAL_SALE_EMAIL_SUBJECT);
  assert.equal(content.text.includes("Maria Silva"), true);
  assert.equal(content.text.includes("Quantidade de livros físicos: 2"), true);
  assert.equal(content.text.includes("E-book adicional: Sim"), true);
  assert.equal(content.text.includes("Postagem em até 3 dias úteis"), true);
  assert.equal(content.html.includes(`/admin/pedidos/${ORDER_ID}`), true);
  assert.equal(content.text.includes(API_KEY), false);
});

test("sendAdminPhysicalSaleEmail envia para Robinho", async () => {
  const { captured, send } = captureSend();
  const result = await sendAdminPhysicalSaleEmail(adminCtx(), env(), { send });
  assert.equal(result.ok, true);
  assert.equal(captured.payload?.to, ADMIN_PHYSICAL_SALE_EMAIL_TO);
  assert.equal(captured.payload?.from, DEFAULT_RESEND_FROM);
  assert.equal(captured.payload?.subject, ADMIN_PHYSICAL_SALE_EMAIL_SUBJECT);
});

test("sendAdminPhysicalSaleEmail falha sem Resend/APP_URL", async () => {
  const { send } = captureSend();
  const noKey = await sendAdminPhysicalSaleEmail(adminCtx(), env({ RESEND_API_KEY: "" }), { send });
  assert.equal(noKey.ok, false);
  if (!noKey.ok) {
    assert.equal(noKey.code, "RESEND_NOT_CONFIGURED");
  }
  const noApp = await sendAdminPhysicalSaleEmail(adminCtx(), env({ APP_URL: "" }), { send });
  assert.equal(noApp.ok, false);
});

test("template buyer shipped inclui rastreio e aviso dos Correios", () => {
  const content = buildBuyerShippedEmail({
    customerName: "Maria Silva",
    friendlyCode: "#BBBBBBBB",
    trackingCode: "AB123456789BR",
  });
  assert.equal(content.subject, BUYER_SHIPPED_EMAIL_SUBJECT);
  assert.equal(content.text.includes("AB123456789BR"), true);
  assert.equal(content.text.includes("pode levar algum tempo"), true);
});

test("sendBuyerShippedEmail envia ao customer_email", async () => {
  const { captured, send } = captureSend();
  const result = await sendBuyerShippedEmail(buyerCtx(), env(), { send });
  assert.equal(result.ok, true);
  assert.equal(captured.payload?.to, "maria@example.com");
  assert.equal(captured.payload?.subject, BUYER_SHIPPED_EMAIL_SUBJECT);
  assert.doesNotThrow(() => assertNoSensitiveFields(result));
});

test("sendBuyerShippedEmail rejeita rastreio/e-mail inválidos", async () => {
  const { send } = captureSend();
  const result = await sendBuyerShippedEmail(
    buyerCtx({ trackingCode: null }),
    env(),
    { send },
  );
  assert.equal(result.ok, false);
});
