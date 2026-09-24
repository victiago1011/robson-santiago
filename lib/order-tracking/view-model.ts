import { friendlyOrderCode } from "@/lib/admin/orders";
import { DIGITAL_BOOK, PHYSICAL_BOOK } from "@/lib/commerce/product";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
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

function step(
  id: string,
  label: string,
  state: TimelineStepState,
): OrderTrackingTimelineStep {
  return { id, label, state };
}

/**
 * Maps current fulfillment_status onto the buyer timeline.
 * "Em trânsito" and "Saiu para entrega" stay upcoming until Correios integration.
 */
export function buildTrackingTimeline(fulfillmentStatus: string): OrderTrackingTimelineStep[] {
  const status = fulfillmentStatus.trim();
  const shippedOrBeyond = status === "shipped" || status === "delivered";
  const delivered = status === "delivered";

  let prepState: TimelineStepState = "upcoming";
  if (status === "pending" || status === "preparing") {
    prepState = "current";
  } else if (shippedOrBeyond) {
    prepState = "done";
  }

  let postedState: TimelineStepState = "upcoming";
  if (status === "shipped") {
    postedState = "current";
  } else if (delivered) {
    postedState = "done";
  }

  return [
    step("payment_confirmed", "Pagamento confirmado", "done"),
    step("preparation", prepLabel(status), prepState),
    step("posted", "Postado", postedState),
    step("in_transit", "Em trânsito", "upcoming"),
    step("out_for_delivery", "Saiu para entrega", "upcoming"),
    step("delivered", "Entregue", delivered ? "done" : "upcoming"),
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

  return {
    friendlyCode: friendlyOrderCode(snapshot.publicId),
    firstName: firstNameFrom(snapshot.customerName),
    statusMessage: trackingStatusMessage(snapshot.fulfillmentStatus),
    city,
    region,
    items,
    paymentConfirmed: true,
    fulfillmentStatus: snapshot.fulfillmentStatus,
    trackingCode:
      snapshot.fulfillmentStatus === "shipped" || snapshot.fulfillmentStatus === "delivered"
        ? snapshot.trackingCode?.trim() || null
        : null,
    timeline: buildTrackingTimeline(snapshot.fulfillmentStatus),
  };
}
