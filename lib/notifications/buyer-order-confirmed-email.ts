import { formatBRLFromCents } from "@/lib/commerce/money";
import { PHYSICAL_SKU, DIGITAL_SKU } from "@/lib/commerce/selection";
import type {
  EmailSendAdapter,
  EmailSendPayload,
} from "@/lib/digital-delivery/ebook-email";
import {
  getAppUrl,
  getResendApiKey,
  getResendFrom,
} from "@/lib/email/config";
import { friendlyOrderCode } from "@/lib/admin/orders";
import type { BuyerOrderConfirmedContext } from "@/lib/notifications/types";

export const BUYER_ORDER_CONFIRMED_EMAIL_SUBJECT =
  "Pedido confirmado — A Vida é um Dia";

export type SendBuyerOrderConfirmedEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; code: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isUsableEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) {
    return false;
  }
  return trimmed.includes("@") && !trimmed.includes(" ");
}

function itemSummaryLines(items: BuyerOrderConfirmedContext["items"]): string[] {
  return items.map((item) => {
    const label =
      item.sku === PHYSICAL_SKU
        ? "Livro físico"
        : item.sku === DIGITAL_SKU
          ? "E-book"
          : item.title;
    return `• ${label} × ${item.quantity}`;
  });
}

export function buildBuyerOrderConfirmedEmail(input: {
  customerName: string;
  friendlyCode: string;
  items: BuyerOrderConfirmedContext["items"];
  totalCents: number | null;
  trackingPageUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = BUYER_ORDER_CONFIRMED_EMAIL_SUBJECT;
  const name = input.customerName.trim() || "Olá";
  const total =
    input.totalCents === null || input.totalCents === undefined
      ? "—"
      : formatBRLFromCents(input.totalCents);
  const lines = itemSummaryLines(input.items);
  const summaryText = lines.join("\n");
  const summaryHtml = lines.map((line) => escapeHtml(line)).join("<br />");

  const text = [
    `${name},`,
    "",
    "Recebemos o pagamento do seu pedido. Obrigado!",
    "",
    `Pedido: ${input.friendlyCode}`,
    "",
    "Resumo:",
    summaryText || "—",
    `Total: ${total}`,
    "",
    "Pagamento confirmado.",
    "",
    "Postagem em até 3 dias úteis após a confirmação do pagamento.",
    "",
    `Acompanhar pedido: ${input.trackingPageUrl}`,
    "",
    "Obrigado,",
    "Robson Santiago",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f4f0;color:#1c1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;padding:40px 32px;border:1px solid #e7e2d8;">
            <tr>
              <td style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#1c1c1c;">
                <p style="margin:0 0 20px;">${escapeHtml(name)},</p>
                <p style="margin:0 0 20px;">Recebemos o pagamento do seu pedido. Obrigado!</p>
                <p style="margin:0 0 8px;"><strong>Pedido:</strong> ${escapeHtml(input.friendlyCode)}</p>
                <p style="margin:0 0 8px;"><strong>Resumo:</strong><br />${summaryHtml || "—"}</p>
                <p style="margin:0 0 20px;"><strong>Total:</strong> ${escapeHtml(total)}</p>
                <p style="margin:0 0 20px;">Pagamento confirmado.</p>
                <p style="margin:0 0 28px;">Postagem em até 3 dias úteis após a confirmação do pagamento.</p>
                <p style="margin:0 0 28px;">
                  <a href="${escapeHtml(input.trackingPageUrl)}" style="display:inline-block;background:#1c1c1c;color:#fffdf8;text-decoration:none;padding:12px 22px;font-family:Georgia,'Times New Roman',serif;font-size:14px;letter-spacing:0.02em;">Acompanhar pedido</a>
                </p>
                <p style="margin:0;">Obrigado,<br />Robson Santiago</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

export async function sendBuyerOrderConfirmedEmail(
  ctx: BuyerOrderConfirmedContext,
  trackingPageUrl: string,
  env: NodeJS.Dict<string> = process.env,
  deps?: { send?: EmailSendAdapter },
): Promise<SendBuyerOrderConfirmedEmailResult> {
  const apiKey = getResendApiKey(env);
  if (!apiKey) {
    return { ok: false, code: "RESEND_NOT_CONFIGURED" };
  }
  const from = getResendFrom(env);
  if (!from) {
    return { ok: false, code: "RESEND_FROM_INVALID" };
  }
  const appUrl = getAppUrl(env);
  if (!appUrl) {
    return { ok: false, code: "APP_URL_INVALID" };
  }
  if (!trackingPageUrl.trim().startsWith(appUrl)) {
    return { ok: false, code: "TRACKING_URL_INVALID" };
  }

  const customerEmail = ctx.customerEmail.trim();
  if (!isUsableEmail(customerEmail)) {
    return { ok: false, code: "EMAIL_INPUT_INVALID" };
  }

  const content = buildBuyerOrderConfirmedEmail({
    customerName: ctx.customerName,
    friendlyCode: friendlyOrderCode(ctx.publicId),
    items: ctx.items,
    totalCents: ctx.totalCents,
    trackingPageUrl,
  });

  const payload: EmailSendPayload = {
    from,
    to: customerEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  };

  const send =
    deps?.send ??
    (await import("@/lib/email/resend")).createResendSendAdapter(apiKey);

  try {
    const result = await send(payload);
    if (!result.ok) {
      console.error("buyer_order_confirmed_email_failed", { code: "EMAIL_SEND_FAILED" });
      return { ok: false, code: "EMAIL_SEND_FAILED" };
    }
    return { ok: true, providerMessageId: result.providerMessageId ?? null };
  } catch {
    console.error("buyer_order_confirmed_email_failed", { code: "EMAIL_SEND_FAILED" });
    return { ok: false, code: "EMAIL_SEND_FAILED" };
  }
}
