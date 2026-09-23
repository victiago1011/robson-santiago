import { fulfillmentStatusLabel, paymentStatusLabel } from "@/lib/admin/orders";

export function StatusBadge({
  kind,
  status,
}: {
  kind: "payment" | "fulfillment";
  status: string;
}) {
  const label = kind === "payment" ? paymentStatusLabel(status) : fulfillmentStatusLabel(status);
  const solid =
    kind === "payment"
      ? status === "approved"
      : status === "shipped" || status === "delivered";
  const muted =
    kind === "payment" ? status === "rejected" || status === "cancelled" : status === "cancelled";
  const className = solid
    ? "bg-ink text-paper"
    : muted
      ? "bg-ink-soft text-paper"
      : "border border-rule bg-paper text-ink";

  return (
    <span className={`inline-flex items-center px-2 py-1 font-sans text-[0.68rem] tracking-wide ${className}`}>
      {label}
    </span>
  );
}
