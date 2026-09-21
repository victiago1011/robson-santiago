import "server-only";

import { Resend } from "resend";
import type { EmailSendAdapter, EmailSendPayload } from "@/lib/digital-delivery/ebook-email";

export function createResendSendAdapter(apiKey: string): EmailSendAdapter {
  const resend = new Resend(apiKey);
  return async (payload: EmailSendPayload) => {
    const { data, error } = await resend.emails.send({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) {
      return { ok: false };
    }
    return { ok: true, providerMessageId: data?.id ?? null };
  };
}
