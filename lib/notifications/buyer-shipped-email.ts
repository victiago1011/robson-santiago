import { getResendApiKey, getResendFrom } from "@/lib/email/config";
import { friendlyOrderCode } from "@/lib/admin/orders";
import type {
  EmailSendAdapter,
  EmailSendPayload,
} from "@/lib/digital-delivery/ebook-email";
import type { BuyerShippedOrderContext } from "@/lib/notifications/types";

export const BUYER_SHIPPED_EMAIL_SUBJECT = "Seu pedido foi postado — A Vida é um Dia";

export type SendBuyerShippedEmailResult =
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

export function buildBuyerShippedEmail(input: {
  customerName: string;
  friendlyCode: string;
  trackingCode: string;
}): { subject: string; html: string; text: string } {
  const subject = BUYER_SHIPPED_EMAIL_SUBJECT;
  const name = input.customerName.trim() || "Olá";
  const text = [
    `${name},`,
    "",
    "Seu pedido do livro “A Vida é um Dia” foi postado.",
    "",
    `Pedido: ${input.friendlyCode}`,
    `Código de rastreio dos Correios: ${input.trackingCode}`,
    "",
    "Você pode acompanhar a entrega no site dos Correios com o código acima.",
    "A atualização do rastreamento pelos Correios pode levar algum tempo para aparecer.",
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
                <p style="margin:0 0 20px;">Seu pedido do livro “A Vida é um Dia” foi postado.</p>
                <p style="margin:0 0 8px;"><strong>Pedido:</strong> ${escapeHtml(input.friendlyCode)}</p>
                <p style="margin:0 0 20px;"><strong>Código de rastreio dos Correios:</strong> ${escapeHtml(input.trackingCode)}</p>
                <p style="margin:0 0 20px;">Você pode acompanhar a entrega no site dos Correios com o código acima.</p>
                <p style="margin:0 0 20px;color:#5a574f;font-size:14px;">A atualização do rastreamento pelos Correios pode levar algum tempo para aparecer.</p>
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

export async function sendBuyerShippedEmail(
  ctx: BuyerShippedOrderContext,
  env: NodeJS.Dict<string> = process.env,
  deps?: { send?: EmailSendAdapter },
): Promise<SendBuyerShippedEmailResult> {
  const apiKey = getResendApiKey(env);
  if (!apiKey) {
    return { ok: false, code: "RESEND_NOT_CONFIGURED" };
  }
  const from = getResendFrom(env);
  if (!from) {
    return { ok: false, code: "RESEND_FROM_INVALID" };
  }

  const tracking = ctx.trackingCode?.trim() ?? "";
  const customerEmail = ctx.customerEmail.trim();
  if (!tracking || !isUsableEmail(customerEmail)) {
    return { ok: false, code: "EMAIL_INPUT_INVALID" };
  }

  const content = buildBuyerShippedEmail({
    customerName: ctx.customerName,
    friendlyCode: friendlyOrderCode(ctx.publicId),
    trackingCode: tracking,
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
      console.error("buyer_shipped_email_failed", { code: "EMAIL_SEND_FAILED" });
      return { ok: false, code: "EMAIL_SEND_FAILED" };
    }
    return { ok: true, providerMessageId: result.providerMessageId ?? null };
  } catch {
    console.error("buyer_shipped_email_failed", { code: "EMAIL_SEND_FAILED" });
    return { ok: false, code: "EMAIL_SEND_FAILED" };
  }
}
