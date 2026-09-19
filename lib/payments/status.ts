export const PAYMENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
  "in_process",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const APPROVED = new Set(["processed", "paid", "approved", "accredited"]);
const IN_PROCESS = new Set(["in_process", "processing", "in_progress"]);
const REJECTED = new Set(["rejected", "failed", "denied", "charged_back"]);
const CANCELLED = new Set(["cancelled", "canceled", "expired"]);
const REFUNDED = new Set(["refunded"]);

export function mapProviderStatus(status: string | null | undefined): PaymentStatus {
  const normalized = (status ?? "").trim().toLowerCase();
  if (APPROVED.has(normalized)) return "approved";
  if (IN_PROCESS.has(normalized)) return "in_process";
  if (REJECTED.has(normalized)) return "rejected";
  if (CANCELLED.has(normalized)) return "cancelled";
  if (REFUNDED.has(normalized)) return "refunded";
  return "pending";
}
