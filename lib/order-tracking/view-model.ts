import { friendlyOrderCode } from "@/lib/admin/orders";
import { DIGITAL_BOOK, PHYSICAL_BOOK } from "@/lib/commerce/product";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import { buildCorreiosTrackingUrl } from "@/lib/order-tracking/correios-url";
import type {
  OrderTrackingDigitalDeliveryFact,
  OrderTrackingOrderSnapshot,
  OrderTrackingPublicItem,
  OrderTrackingPublicView,
  OrderTrackingTimelineStep,
  PublicDigitalDeliveryStatus,
  TimelineStepState,
} from "@/lib/order-tracking/types";

function firstNameFrom(fullName: string): string | null {
  const first = fullName.trim().split(/\s+/).find(Boolean);
  if (!first) {
    return null;
  }
  // Presentation only — does not change the stored customer_name.
  if (first === first.toUpperCase() || first === first.toLowerCase()) {
    return first.charAt(0).toLocaleUpperCase("pt-BR") + first.slice(1).toLocaleLowerCase("pt-BR");
  }
  return first;
}

function prepLabel(fulfillmentStatus: string): string {
  if (fulfillmentStatus === "pending") {
    return "Aguardando preparação";
  }
  return "Preparando seu pedido";
}

/** Buyer-facing date under timeline steps — America/Sao_Paulo, e.g. "25/09/2026 às 14:32". */
export function formatTrackingDateTime(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string") {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const datePart = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(date);
  return `${datePart} às ${timePart}`;
}

function step(
  id: string,
  label: string,
  state: TimelineStepState,
  occurredAt: string | null,
): OrderTrackingTimelineStep {
  return { id, label, state, occurredAt };
}

/**
 * Maps fulfillment_status onto the buyer timeline (3 public steps only).
 * `delivered` in the DB still exists, but there is no visual "Entregue" step —
 * all three steps render as done.
 */
export function buildTrackingTimeline(
  fulfillmentStatus: string,
  dates?: {
    paidAt?: string | null;
    preparingStartedAt?: string | null;
    shippedAt?: string | null;
  },
): OrderTrackingTimelineStep[] {
  const status = fulfillmentStatus.trim();
  const shippedOrBeyond = status === "shipped" || status === "delivered";
  const fullyDone = status === "delivered";

  let prepState: TimelineStepState = "upcoming";
  if (fullyDone || shippedOrBeyond) {
    prepState = "done";
  } else if (status === "pending" || status === "preparing") {
    prepState = "current";
  }

  let postedState: TimelineStepState = "upcoming";
  if (fullyDone) {
    postedState = "done";
  } else if (status === "shipped") {
    postedState = "current";
  }

  return [
    step(
      "payment_confirmed",
      "Pagamento confirmado",
      "done",
      formatTrackingDateTime(dates?.paidAt ?? null),
    ),
    step(
      "preparation",
      prepLabel(status),
      prepState,
      formatTrackingDateTime(dates?.preparingStartedAt ?? null),
    ),
    step(
      "posted",
      "Postado",
      postedState,
      formatTrackingDateTime(dates?.shippedAt ?? null),
    ),
  ];
}

export function trackingStatusMessage(fulfillmentStatus: string): string {
  const status = fulfillmentStatus.trim();
  if (status === "delivered") {
    return "Seu pedido foi entregue.";
  }
  if (status === "shipped") {
    return "Seu pedido está a caminho.";
  }
  return "Seu pedido está sendo preparado.";
}

function chooseDeliveryFact(
  facts: OrderTrackingDigitalDeliveryFact[],
): OrderTrackingDigitalDeliveryFact | null {
  if (facts.length === 0) {
    return null;
  }
  return (
    facts
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
  );
}

/**
 * Buyer-facing digital status from the real digital_deliveries row.
 * "delivered" only when email_status is sent (efetivamente concluída).
 *
 * In this buyer UI, "Entregue" means digital access was successfully emailed
 * to the buyer — not that the file was necessarily downloaded.
 */
export function toPublicDigitalDeliveryStatus(
  fact: OrderTrackingDigitalDeliveryFact | null,
): PublicDigitalDeliveryStatus {
  if (!fact || fact.revokedAt) {
    return "pending";
  }
  if (fact.emailStatus === "sent") {
    return "delivered";
  }
  if (fact.emailStatus === "sending") {
    return "processing";
  }
  if (fact.emailStatus === "failed") {
    return "failed";
  }
  return "pending";
}

export function digitalDeliveryStatusLabel(status: PublicDigitalDeliveryStatus): string {
  // "Entregue ✓" = email_status "sent" (acesso digital enviado), não download confirmado.
  if (status === "delivered") {
    return "Entregue ✓";
  }
  if (status === "processing") {
    return "Enviando";
  }
  if (status === "failed") {
    return "Em reprocessamento";
  }
  return "Em breve";
}

function toPublicItem(
  item: OrderTrackingOrderSnapshot["items"][number],
  digitalDeliveries: OrderTrackingDigitalDeliveryFact[],
): OrderTrackingPublicItem {
  if (item.sku === DIGITAL_SKU) {
    const fact = chooseDeliveryFact(
      digitalDeliveries.filter((row) => row.orderItemId === item.id),
    );
    return {
      title: item.title,
      quantity: item.quantity,
      kind: "digital",
      format: DIGITAL_BOOK.format,
      digitalDeliveryStatus: toPublicDigitalDeliveryStatus(fact),
    };
  }

  return {
    title: item.title,
    quantity: item.quantity,
    kind: "physical",
    format: item.sku === PHYSICAL_SKU ? PHYSICAL_BOOK.format : "Item",
  };
}

export function toOrderTrackingPublicView(
  snapshot: OrderTrackingOrderSnapshot,
): OrderTrackingPublicView {
  const items = snapshot.items.map((item) =>
    toPublicItem(item, snapshot.digitalDeliveries),
  );

  const city = snapshot.shippingCity?.trim() || null;
  const region = snapshot.shippingState?.trim() || null;
  const trackingVisible =
    snapshot.fulfillmentStatus === "shipped" || snapshot.fulfillmentStatus === "delivered"
      ? snapshot.trackingCode?.trim() || null
      : null;

  return {
    friendlyCode: friendlyOrderCode(snapshot.publicId),
    firstName: firstNameFrom(snapshot.customerName),
    statusMessage: trackingStatusMessage(snapshot.fulfillmentStatus),
    city,
    region,
    items,
    paymentConfirmed: true,
    fulfillmentStatus: snapshot.fulfillmentStatus,
    trackingCode: trackingVisible,
    correiosTrackingUrl: trackingVisible ? buildCorreiosTrackingUrl(trackingVisible) : null,
    timeline: buildTrackingTimeline(snapshot.fulfillmentStatus, {
      paidAt: snapshot.paidAt,
      preparingStartedAt: snapshot.preparingStartedAt,
      shippedAt: snapshot.shippedAt,
    }),
  };
}
