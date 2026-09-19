import { centsToDecimalString } from "@/lib/payments/amount";
import type { MercadoPagoOrder } from "@/lib/payments/types";
import type { PublicPaymentResult, PublicPixDetails } from "@/lib/payments/types";
import { mapProviderStatus } from "@/lib/payments/status";

export function firstTransaction(order: MercadoPagoOrder | null | undefined) {
  return order?.transactions?.payments?.[0] ?? null;
}

export function toPublicPaymentResult(
  method: "pix" | "credit_card",
  order: MercadoPagoOrder | null | undefined,
): PublicPaymentResult {
  const transaction = firstTransaction(order);
  const status = mapProviderStatus(transaction?.status ?? order?.status);
  const statusDetail = transaction?.status_detail ?? order?.status_detail ?? null;
  const pix = method === "pix" ? extractPix(transaction?.payment_method) : null;

  return {
    status,
    statusDetail,
    method,
    pix,
  };
}

function extractPix(paymentMethod: {
  qr_code?: string | null;
  qr_code_base64?: string | null;
  ticket_url?: string | null;
} | null | undefined): PublicPixDetails | null {
  const qrCode = paymentMethod?.qr_code?.trim();
  if (!qrCode) {
    return null;
  }

  return {
    qrCode,
    qrCodeBase64: paymentMethod?.qr_code_base64?.trim() || null,
    ticketUrl: paymentMethod?.ticket_url?.trim() || null,
  };
}

export function splitPersonName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

export { centsToDecimalString };
