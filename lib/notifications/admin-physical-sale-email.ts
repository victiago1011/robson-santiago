import { formatBRLFromCents } from "@/lib/commerce/money";
import { PHYSICAL_SKU, DIGITAL_SKU } from "@/lib/commerce/selection";
import {
  getAppUrl,
  getResendApiKey,
  getResendFrom,
} from "@/lib/email/config";
import { friendlyOrderCode } from "@/lib/admin/orders";
import type {
  EmailSendAdapter,
  EmailSendPayload,
} from "@/lib/digital-delivery/ebook-email";
import type { AdminPhysicalSaleOrderContext } from "@/lib/notifications/types";

export const ADMIN_PHYSICAL_SALE_EMAIL_TO = "robinho@correntedobembr.com.br";

export const ADMIN_PHYSICAL_SALE_EMAIL_SUBJECT =
  "Nova venda física — A Vida é um Dia";

export type SendAdminPhysicalSaleEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; code: string };

function formatPaidAt(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatAddress(ctx: AdminPhysicalSaleOrderContext): string {
  const line1 = [ctx.shippingStreet, ctx.shippingNumber].filter(Boolean).join(", ");
  const line2 = ctx.shippingComplement?.trim() || "";
  const line3 = [ctx.shippingDistrict, ctx.shippingCity, ctx.shippingState]
    .filter(Boolean)
    .join(" · ");
  const zip = ctx.shippingZip?.trim() || "";
  return [line1, line2, line3, zip ? `CEP ${zip}` : ""].filter(Boolean).join("\n");
}

function physicalQuantity(items: AdminPhysicalSaleOrderContext["items"]): number {
  return items.reduce((sum, item) => (item.sku === PHYSICAL_SKU ? sum + item.quantity : sum), 0);
}

function hasEbook(items: AdminPhysicalSaleOrderContext["items"]): boolean {
  return items.some((item) => item.sku === DIGITAL_SKU);
}

export function buildAdminPhysicalSaleEmail(
  ctx: AdminPhysicalSaleOrderContext,
  adminOrderUrl: string,
): { subject: string; html: string; text: string } {
  const friendly = friendlyOrderCode(ctx.publicId);
  const qty = physicalQuantity(ctx.items);
  const ebook = hasEbook(ctx.items);
  const total =
    ctx.totalCents === null || ctx.totalCents === undefined
      ? "—"
      : formatBRLFromCents(ctx.totalCents);
  const address = formatAddress(ctx);
  const paidAt = formatPaidAt(ctx.paidAt);
  const subject = ADMIN_PHYSICAL_SALE_EMAIL_SUBJECT;

  const text = [
    "Nova venda do livro “A Vida é um Dia”.",
    "",
    `Pedido: ${friendly}`,
    `Comprador: ${ctx.customerName}`,
    `Quantidade de livros físicos: ${qty}`,
    `E-book adicional: ${ebook ? "Sim" : "Não"}`,
    `Total: ${total}`,
    `Pagamento confirmado em: ${paidAt}`,
    "",
    "Endereço para postagem:",
    address || "—",
    "",
    "Postagem em até 3 dias úteis após a confirmação do pagamento.",
    "",
    `Abrir pedido: ${adminOrderUrl}`,
  ].join("\n");

  const addressHtml = (address || "—")
    .split("\n")
    .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
    .join("<br />");

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
                <p style="margin:0 0 20px;">Nova venda do livro “A Vida é um Dia”.</p>
                <p style="margin:0 0 8px;"><strong>Pedido:</strong> ${friendly}</p>
                <p style="margin:0 0 8px;"><strong>Comprador:</strong> ${escapeHtml(ctx.customerName)}</p>
                <p style="margin:0 0 8px;"><strong>Quantidade de livros físicos:</strong> ${qty}</p>
                <p style="margin:0 0 8px;"><strong>E-book adicional:</strong> ${ebook ? "Sim" : "Não"}</p>
                <p style="margin:0 0 8px;"><strong>Total:</strong> ${total}</p>
                <p style="margin:0 0 20px;"><strong>Pagamento confirmado em:</strong> ${paidAt}</p>
                <p style="margin:0 0 8px;"><strong>Endereço para postagem:</strong></p>
                <p style="margin:0 0 20px;">${addressHtml}</p>
                <p style="margin:0 0 28px;">Postagem em até 3 dias úteis após a confirmação do pagamento.</p>
                <p style="margin:0;">
                  <a href="${adminOrderUrl}" style="display:inline-block;background:#1c1c1c;color:#fffdf8;text-decoration:none;padding:12px 22px;font-family:Georgia,'Times New Roman',serif;font-size:14px;">Abrir pedido no Admin</a>
                </p>
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendAdminPhysicalSaleEmail(
  ctx: AdminPhysicalSaleOrderContext,
  env: NodeJS.Dict<string> = process.env,
  deps?: { send?: EmailSendAdapter; to?: string },
): Promise<SendAdminPhysicalSaleEmailResult> {
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
    return { ok: false, code: "APP_URL_NOT_CONFIGURED" };
  }

  const adminOrderUrl = `${appUrl}/admin/pedidos/${ctx.orderId}`;
  const content = buildAdminPhysicalSaleEmail(ctx, adminOrderUrl);
  const to = (deps?.to ?? ADMIN_PHYSICAL_SALE_EMAIL_TO).trim();
  const payload: EmailSendPayload = {
    from,
    to,
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
      console.error("admin_physical_sale_email_failed", { code: "EMAIL_SEND_FAILED" });
      return { ok: false, code: "EMAIL_SEND_FAILED" };
    }
    return { ok: true, providerMessageId: result.providerMessageId ?? null };
  } catch {
    console.error("admin_physical_sale_email_failed", { code: "EMAIL_SEND_FAILED" });
    return { ok: false, code: "EMAIL_SEND_FAILED" };
  }
}
