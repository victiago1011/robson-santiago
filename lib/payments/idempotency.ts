import type { PaymentStatus } from "@/lib/payments/status";

export type ExistingPaymentAttempt = {
  id: string;
  orderId: string;
  publicId: string;
  idempotencyKey: string;
  status: PaymentStatus;
  providerOrderId: string | null;
  providerPaymentId: string | null;
};

export type IdempotencyDecision =
  | { action: "create" }
  | { action: "retry_provider"; attempt: ExistingPaymentAttempt }
  | { action: "reuse_result"; attempt: ExistingPaymentAttempt };

export function decidePaymentAttemptAction(
  existing: ExistingPaymentAttempt | null,
): IdempotencyDecision {
  if (!existing) {
    return { action: "create" };
  }

  if (existing.providerOrderId || existing.status === "rejected" || existing.status === "approved") {
    return { action: "reuse_result", attempt: existing };
  }

  return { action: "retry_provider", attempt: existing };
}

export function newPaymentAttemptId(): string {
  return crypto.randomUUID();
}
