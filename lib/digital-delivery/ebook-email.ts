import {
  EBOOK_DOWNLOAD_PATH_PREFIX,
  ebookDownloadValidityDays,
  normalizeDownloadToken,
} from "@/lib/digital-delivery/download-policy";
import {
  getAppUrl,
  getResendApiKey,
  getResendFrom,
} from "@/lib/email/config";

export const EBOOK_DELIVERY_EMAIL_SUBJECT = 'Seu e-book “A Vida é um Dia” está disponível';

export type EbookDeliveryEmailInput = {
  customerEmail: string;
  rawToken: string;
};

export type EbookDeliveryEmailContent = {
  subject: string;
  html: string;
  text: string;
  downloadUrl: string;
};

export type EmailSendPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendAdapter = (
  payload: EmailSendPayload,
) => Promise<{ ok: boolean; providerMessageId?: string | null }>;

export type SendEbookDeliveryEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; code: string };

function isUsableCustomerEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) {
    return false;
  }
  return trimmed.includes("@") && !trimmed.includes(" ");
}

export function buildEbookDownloadUrl(appUrl: string, rawToken: string): string {
  return `${appUrl}${EBOOK_DOWNLOAD_PATH_PREFIX}/${encodeURIComponent(rawToken)}`;
}

export function buildEbookDeliveryEmail(downloadUrl: string): Omit<EbookDeliveryEmailContent, "downloadUrl"> {
  const days = ebookDownloadValidityDays();
  const subject = EBOOK_DELIVERY_EMAIL_SUBJECT;
  const text = [
    "Olá,",
    "",
    "Obrigado por adquirir o e-book “A Vida é um Dia”.",
    "",
    "Seu exemplar digital já está disponível para download:",
    downloadUrl,
    "",
    `O link ficará disponível por ${days} dias.`,
    "",
    "Boa leitura!",
    "",
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
                <p style="margin:0 0 20px;">Olá,</p>
                <p style="margin:0 0 20px;">Obrigado por adquirir o e-book “A Vida é um Dia”.</p>
                <p style="margin:0 0 28px;">Seu exemplar digital já está disponível para download.</p>
                <p style="margin:0 0 28px;">
                  <a href="${downloadUrl}" style="display:inline-block;background:#1c1c1c;color:#fffdf8;text-decoration:none;padding:12px 22px;font-family:Georgia,'Times New Roman',serif;font-size:14px;letter-spacing:0.02em;">Baixar meu e-book</a>
                </p>
                <p style="margin:0 0 20px;color:#5a574f;font-size:14px;">O link ficará disponível por ${days} dias.</p>
                <p style="margin:0 0 20px;">Boa leitura!</p>
                <p style="margin:0;">Robson Santiago</p>
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

export async function sendEbookDeliveryEmail(
  input: EbookDeliveryEmailInput,
  env: NodeJS.Dict<string> = process.env,
  deps?: { send?: EmailSendAdapter },
): Promise<SendEbookDeliveryEmailResult> {
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

  const customerEmail = input.customerEmail.trim();
  const rawToken = normalizeDownloadToken(input.rawToken);
  if (!isUsableCustomerEmail(customerEmail) || !rawToken) {
    return { ok: false, code: "EMAIL_INPUT_INVALID" };
  }

  const downloadUrl = buildEbookDownloadUrl(appUrl, rawToken);
  const content = buildEbookDeliveryEmail(downloadUrl);
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
      console.error("ebook_delivery_email_failed", { code: "EMAIL_SEND_FAILED" });
      return { ok: false, code: "EMAIL_SEND_FAILED" };
    }
    return { ok: true, providerMessageId: result.providerMessageId ?? null };
  } catch {
    console.error("ebook_delivery_email_failed", { code: "EMAIL_SEND_FAILED" });
    return { ok: false, code: "EMAIL_SEND_FAILED" };
  }
}
