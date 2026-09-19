export const PAYMENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
  "in_process",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_PAYMENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
] as const;

export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

const APPROVED = new Set(["processed", "paid", "approved"]);
const IN_PROCESS = new Set(["in_process", "processing", "in_progress"]);
const REJECTED = new Set(["rejected", "failed", "denied"]);
const CANCELLED = new Set(["cancelled", "canceled", "expired"]);
const REFUNDED = new Set(["refunded"]);

export function isKnownProviderStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return (
    APPROVED.has(normalized) ||
    IN_PROCESS.has(normalized) ||
    REJECTED.has(normalized) ||
    CANCELLED.has(normalized) ||
    REFUNDED.has(normalized) ||
    normalized === "created" ||
    normalized === "action_required" ||
    normalized === "charged_back"
  );
}

export function mapProviderStatus(status: string | null | undefined): PaymentStatus {
  const normalized = (status ?? "").trim().toLowerCase();
  if (APPROVED.has(normalized)) return "approved";
  if (IN_PROCESS.has(normalized)) return "in_process";
  if (REJECTED.has(normalized) || normalized === "charged_back") return "rejected";
  if (CANCELLED.has(normalized)) return "cancelled";
  if (REFUNDED.has(normalized)) return "refunded";
  return "pending";
}

export function toOrderPaymentStatus(status: PaymentStatus): OrderPaymentStatus {
  if (status === "in_process") {
    return "pending";
  }
  return status;
}

const ORDER_TRANSITIONS: Record<OrderPaymentStatus, ReadonlySet<OrderPaymentStatus>> = {
  pending: new Set(["pending", "approved", "rejected", "cancelled", "refunded"]),
  approved: new Set(["approved", "refunded"]),
  rejected: new Set(["rejected", "approved", "cancelled"]),
  cancelled: new Set(["cancelled"]),
  refunded: new Set(["refunded"]),
};

const ATTEMPT_TRANSITIONS: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  pending: new Set(["pending", "in_process", "approved", "rejected", "cancelled", "refunded"]),
  in_process: new Set(["in_process", "pending", "approved", "rejected", "cancelled", "refunded"]),
  approved: new Set(["approved", "refunded"]),
  rejected: new Set(["rejected", "approved", "cancelled"]),
  cancelled: new Set(["cancelled"]),
  refunded: new Set(["refunded"]),
};

export function canTransitionOrderPaymentStatus(
  from: OrderPaymentStatus,
  to: OrderPaymentStatus,
): boolean {
  return ORDER_TRANSITIONS[from]?.has(to) ?? false;
}

export function canTransitionPaymentAttemptStatus(from: PaymentStatus, to: PaymentStatus): boolean {
  return ATTEMPT_TRANSITIONS[from]?.has(to) ?? false;
}
