import { digitalDeliveryStatusLabel } from "@/lib/order-tracking/view-model";
import type {
  OrderTrackingPublicItem,
  PublicDigitalDeliveryStatus,
} from "@/lib/order-tracking/types";

type OrderTrackingSummaryCardProps = {
  items: OrderTrackingPublicItem[];
  destination: string | null;
};

function DigitalStatusBadge({ status }: { status: PublicDigitalDeliveryStatus }) {
  const delivered = status === "delivered";
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-sans text-[0.7rem] tracking-[0.08em] ${
        delivered
          ? "border-ink/20 bg-ink text-paper"
          : "border-rule bg-paper text-ink/55"
      }`}
    >
      {digitalDeliveryStatusLabel(status)}
    </span>
  );
}

export default function OrderTrackingSummaryCard({
  items,
  destination,
}: OrderTrackingSummaryCardProps) {
  return (
    <aside
      aria-labelledby="resumo-pedido-heading"
      className="border border-rule bg-paper-strong px-5 py-6 md:px-6 md:py-7"
    >
      <h2
        id="resumo-pedido-heading"
        className="font-display text-xl tracking-tight text-ink md:text-[1.35rem]"
      >
        Seu pedido
      </h2>

      <ul className="mt-6 space-y-5">
        {items.map((item) => (
          <li key={`${item.kind}-${item.title}-${item.quantity}`}>
            <p className="font-sans text-[0.95rem] leading-snug text-ink">{item.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <p className="font-sans text-sm text-ink-soft">
                {item.format} × {item.quantity}
              </p>
              {item.kind === "digital" && item.digitalDeliveryStatus ? (
                <DigitalStatusBadge status={item.digitalDeliveryStatus} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {destination ? (
        <div className="mt-7 border-t border-rule pt-5">
          <p className="font-sans text-[0.65rem] tracking-[0.14em] text-ink/50 uppercase">
            Destino
          </p>
          <p className="mt-1.5 font-sans text-sm text-ink">{destination}</p>
        </div>
      ) : null}
    </aside>
  );
}
