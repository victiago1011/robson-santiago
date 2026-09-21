import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EBOOK_DELIVERY_EMAIL_SUBJECT,
  buildEbookDeliveryEmail,
  buildEbookDownloadUrl,
  sendEbookDeliveryEmail,
  type EmailSendPayload,
} from "@/lib/digital-delivery/ebook-email";
import { EBOOK_DOWNLOAD_PATH_PREFIX } from "@/lib/digital-delivery/download-policy";
import { DEFAULT_RESEND_FROM } from "@/lib/email/config";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";

const APP_URL = "https://www.robsonsantiago.com.br";
const CUSTOMER_EMAIL = "comprador@example.com";
const RAW_TOKEN = "ebook-token-abc_123";
const API_KEY = "re_test_placeholder_key";

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
      return { ok: true as const, providerMessageId: null };
    },
  };
}

test("from padrão e destinatário/assunto corretos vão ao Resend", async () => {
  const { captured, send } = captureSend();
  const result = await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env(),
    { send },
  );

  assert.equal(result.ok, true);
  assert.equal(captured.payload?.from, DEFAULT_RESEND_FROM);
  assert.equal(captured.payload?.to, CUSTOMER_EMAIL);
  assert.equal(captured.payload?.subject, EBOOK_DELIVERY_EMAIL_SUBJECT);
  assert.equal(captured.payload?.subject.includes("A Vida é um Dia"), true);
});

test("RESEND_FROM customizado é respeitado", async () => {
  const { captured, send } = captureSend();
  await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env({ RESEND_FROM: "Robson Santiago <livro@send.robsonsantiago.com.br>" }),
    { send },
  );
  assert.equal(captured.payload?.from, "Robson Santiago <livro@send.robsonsantiago.com.br>");
});

test("link usa APP_URL + rota da aplicação e token só no conteúdo necessário", async () => {
  const { captured, send } = captureSend();
  const expectedUrl = buildEbookDownloadUrl(APP_URL, RAW_TOKEN);
  await sendEbookDeliveryEmail(
    { customerEmail: ` ${CUSTOMER_EMAIL} `, rawToken: RAW_TOKEN },
    env({ APP_URL: `${APP_URL}/` }),
    { send },
  );

  assert.equal(expectedUrl, `${APP_URL}${EBOOK_DOWNLOAD_PATH_PREFIX}/${encodeURIComponent(RAW_TOKEN)}`);
  assert.equal(captured.payload?.html.includes(expectedUrl), true);
  assert.equal(captured.payload?.html.includes('Baixar meu e-book'), true);
  assert.equal(captured.payload?.text.includes(expectedUrl), true);
  assert.equal(captured.payload?.subject.includes(RAW_TOKEN), false);
  assert.equal(captured.payload?.from.includes(RAW_TOKEN), false);
  assert.equal(captured.payload?.to.includes(RAW_TOKEN), false);
});

test("nenhuma URL do Supabase/Storage aparece no e-mail", async () => {
  const { captured, send } = captureSend();
  await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env(),
    { send },
  );
  const body = `${captured.payload?.html}\n${captured.payload?.text}`;
  assert.equal(body.toLowerCase().includes("supabase"), false);
  assert.equal(body.toLowerCase().includes("storage/v1"), false);
  assert.equal(body.includes("ebooks/a-vida-e-um-dia-ebook.pdf"), false);
  assert.equal(body.includes("signed"), false);
});

test("HTML possui CTA e texto possui link; PDF não é anexo", async () => {
  const downloadUrl = buildEbookDownloadUrl(APP_URL, RAW_TOKEN);
  const content = buildEbookDeliveryEmail(downloadUrl);
  assert.equal(content.html.includes(`href="${downloadUrl}"`), true);
  assert.equal(content.html.includes("Baixar meu e-book"), true);
  assert.equal(content.text.includes(downloadUrl), true);
  assert.equal(content.html.toLowerCase().includes("attachment"), false);
  assert.equal(content.text.includes("30 dias"), true);
});

test("ausência de RESEND_API_KEY falha de forma segura sem chamar o sender", async () => {
  let called = false;
  const result = await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env({ RESEND_API_KEY: "" }),
    {
      send: async () => {
        called = true;
        return { ok: true };
      },
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "RESEND_NOT_CONFIGURED");
  }
  assert.equal(called, false);
  assert.doesNotThrow(() => assertNoSensitiveFields(result));
});

test("APP_URL ausente ou inválida falha de forma segura", async () => {
  let called = false;
  const send = async () => {
    called = true;
    return { ok: true };
  };

  const missing = await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env({ APP_URL: "" }),
    { send },
  );
  const invalid = await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env({ APP_URL: "not-a-url" }),
    { send },
  );
  const supabaseHost = await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env({ APP_URL: "https://xyz.supabase.co" }),
    { send },
  );

  assert.equal(missing.ok, false);
  assert.equal(invalid.ok, false);
  assert.equal(supabaseHost.ok, false);
  if (!missing.ok) {
    assert.equal(missing.code, "APP_URL_NOT_CONFIGURED");
  }
  assert.equal(called, false);
});

test("erro do Resend vira resultado controlado sem vazar dados", async () => {
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };
  try {
    const failed = await sendEbookDeliveryEmail(
      { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
      env(),
      { send: async () => ({ ok: false }) },
    );
    const thrown = await sendEbookDeliveryEmail(
      { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
      env(),
      {
        send: async () => {
          throw new Error(`resend boom ${API_KEY} ${CUSTOMER_EMAIL} ${RAW_TOKEN}`);
        },
      },
    );

    assert.equal(failed.ok, false);
    assert.equal(thrown.ok, false);
    if (!failed.ok) {
      assert.equal(failed.code, "EMAIL_SEND_FAILED");
    }
    assert.doesNotThrow(() => assertNoSensitiveFields(failed));
    assert.doesNotThrow(() => assertNoSensitiveFields(thrown));
    const serialized = JSON.stringify(errors);
    assert.equal(serialized.includes(API_KEY), false);
    assert.equal(serialized.includes(CUSTOMER_EMAIL), false);
    assert.equal(serialized.includes(RAW_TOKEN), false);
    assert.equal(serialized.includes("/api/ebook/download/"), false);
  } finally {
    console.error = original;
  }
});

test("resultado de sucesso não contém token, e-mail ou chave", async () => {
  const result = await sendEbookDeliveryEmail(
    { customerEmail: CUSTOMER_EMAIL, rawToken: RAW_TOKEN },
    env(),
    { send: async () => ({ ok: true, providerMessageId: "msg_ebook_1" }) },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.providerMessageId, "msg_ebook_1");
  }
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(RAW_TOKEN), false);
  assert.equal(serialized.includes(CUSTOMER_EMAIL), false);
  assert.equal(serialized.includes(API_KEY), false);
  assert.doesNotThrow(() => assertNoSensitiveFields(result));
});
