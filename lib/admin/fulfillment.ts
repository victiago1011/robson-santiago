import { PHYSICAL_SKU } from "@/lib/commerce/selection";

export const CORREIOS_TRACKING_PATTERN = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

export function normalizeTrackingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function isValidCorreiosTrackingCode(code: string): boolean {
  return CORREIOS_TRACKING_PATTERN.test(code);
}

export type FulfillmentOrderSnapshot = {
  id: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingCode: string | null;
  items: Array<{ sku: string }>;
};

export type StartPreparationDecision =
  | { ok: true }
  | { ok: false; code: string };

export type ConfirmShipmentDecision =
  | { ok: true; trackingCode: string }
  | { ok: false; code: string };

export function decideStartPreparation(order: FulfillmentOrderSnapshot): StartPreparationDecision {
  if (!order.items.some((item) => item.sku === PHYSICAL_SKU)) {
    return { ok: false, code: "NOT_PHYSICAL" };
  }
  if (order.paymentStatus !== "approved") {
    return { ok: false, code: "PAYMENT_NOT_APPROVED" };
  }
  if (order.fulfillmentStatus === "cancelled") {
    return { ok: false, code: "ORDER_CANCELLED" };
  }
  if (order.fulfillmentStatus !== "pending") {
    return { ok: false, code: "INVALID_FULFILLMENT_STATE" };
  }
  return { ok: true };
}

export function decideConfirmShipment(
  order: FulfillmentOrderSnapshot,
  rawTracking: string,
): ConfirmShipmentDecision {
  if (!order.items.some((item) => item.sku === PHYSICAL_SKU)) {
    return { ok: false, code: "NOT_PHYSICAL" };
  }
  if (order.paymentStatus !== "approved") {
    return { ok: false, code: "PAYMENT_NOT_APPROVED" };
  }
  if (order.fulfillmentStatus === "cancelled") {
    return { ok: false, code: "ORDER_CANCELLED" };
  }
  if (order.fulfillmentStatus === "shipped" || order.fulfillmentStatus === "delivered") {
    return { ok: false, code: "ALREADY_SHIPPED" };
  }
  if (order.fulfillmentStatus !== "preparing") {
    return { ok: false, code: "INVALID_FULFILLMENT_STATE" };
  }

  const trackingCode = normalizeTrackingCode(rawTracking);
  if (!trackingCode || !isValidCorreiosTrackingCode(trackingCode)) {
    return { ok: false, code: "INVALID_TRACKING_CODE" };
  }
  return { ok: true, trackingCode };
}
