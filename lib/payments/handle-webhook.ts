import { getMercadoPagoWebhookSecret } from "@/lib/payments/config";
import {
  extractWebhookDataId,
  verifyMercadoPagoSignature,
} from "@/lib/payments/webhook-signature";

export const WEBHOOK_RECONCILIATION_ENABLED = false;

export type WebhookHandleResult = {
  ok: boolean;
  code: string;
  status: number;
  dataId: string | null;
};

export async function handleMercadoPagoWebhook(
  request: Request,
  env: NodeJS.Dict<string> = process.env,
): Promise<WebhookHandleResult> {
  const secret = getMercadoPagoWebhookSecret(env);
  if (!secret) {
    return { ok: false, code: "WEBHOOK_NOT_CONFIGURED", status: 503, dataId: null };
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const url = new URL(request.url);
  const dataId = extractWebhookDataId({ searchParams: url.searchParams, body });
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");

  const valid = verifyMercadoPagoSignature({
    secret,
    signatureHeader: signature,
    requestId,
    dataId,
  });

  if (!valid) {
    return { ok: false, code: "INVALID_SIGNATURE", status: 401, dataId };
  }

  if (!WEBHOOK_RECONCILIATION_ENABLED) {
    return { ok: false, code: "WEBHOOK_PROCESSING_DISABLED", status: 503, dataId };
  }

  return { ok: true, code: "ACCEPTED", status: 200, dataId };
}
