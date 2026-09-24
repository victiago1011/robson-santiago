import { friendlyOrderCode } from "@/lib/admin/orders";
import type {
  OrderTrackingOrderSnapshot,
  OrderTrackingPublicView,
  OrderTrackingTimelineStep,
  TimelineStepState,
} from "@/lib/order-tracking/types";

function firstNameFrom(fullName: string): string | null {
  const first = fullName.trim().split(/\s+/).find(Boolean);
  return first ?? null;
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

export function toOrderTrackingPublicView(
  snapshot: OrderTrackingOrderSnapshot,
): OrderTrackingPublicView {
  const items = snapshot.items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
  }));

  const city = snapshot.shippingCity?.trim() || null;
  const region = snapshot.shippingState?.trim() || null;

  return {
    friendlyCode: friendlyOrderCode(snapshot.publicId),
    firstName: firstNameFrom(snapshot.customerName),
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
