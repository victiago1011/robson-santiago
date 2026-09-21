import { z } from "zod";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import { ORDER_PAYMENT_STATUSES } from "@/lib/payments/status";

export const PUBLIC_PAYMENT_STATUSES = [
  "pending",
  "in_process",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
] as const;

export type PublicPaymentStatus = (typeof PUBLIC_PAYMENT_STATUSES)[number];

const publicIdSchema = z.uuid();
const returnedStatusSet = new Set<string>([...ORDER_PAYMENT_STATUSES, "in_process"]);

export type PublicPaymentStatusSuccess = {
  ok: true;
  status: PublicPaymentStatus;
};

export type PublicPaymentStatusFailure = {
  ok: false;
  code: "VALIDATION_ERROR" | "ORDER_NOT_FOUND" | "SUPABASE_NOT_CONFIGURED" | "STATUS_UNAVAILABLE";
  status: number;
};

export type PublicPaymentStatusResult = PublicPaymentStatusSuccess | PublicPaymentStatusFailure;

export type PublicPaymentStatusStore = {
  findOrderByPublicId: (publicId: string) => Promise<{ paymentStatus: string } | null>;
};

function isPublicPaymentStatus(value: string): value is PublicPaymentStatus {
  return returnedStatusSet.has(value);
}

export function parsePublicOrderId(publicId: string): string | null {
  const parsed = publicIdSchema.safeParse(publicId);
  return parsed.success ? parsed.data : null;
}

export async function getPublicPaymentStatus(
  publicId: string,
  store: PublicPaymentStatusStore,
): Promise<PublicPaymentStatusResult> {
  const id = parsePublicOrderId(publicId);
  if (!id) {
    return { ok: false, code: "VALIDATION_ERROR", status: 400 };
  }

  const order = await store.findOrderByPublicId(id);
  if (!order) {
    return { ok: false, code: "ORDER_NOT_FOUND", status: 404 };
  }

  const paymentStatus = order.paymentStatus;
  if (!isPublicPaymentStatus(paymentStatus)) {
    return { ok: false, code: "STATUS_UNAVAILABLE", status: 503 };
  }

  const payload: PublicPaymentStatusSuccess = { ok: true, status: paymentStatus };
  assertNoSensitiveFields(payload);
  return payload;
}
