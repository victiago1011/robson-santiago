export type OrderTrackingAccessRow = {
  id: string;
  orderId: string;
  tokenHash: string;
  revokedAt: string | null;
  createdAt: string;
};

export type OrderTrackingDigitalDeliveryFact = {
  orderItemId: string;
  emailStatus: string;
  revokedAt: string | null;
  createdAt: string;
};

export type OrderTrackingOrderSnapshot = {
  orderId: string;
  publicId: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  shippingCity: string | null;
  shippingState: string | null;
  trackingCode: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  /** Earliest fulfillment_preparing_started event, if any. */
  preparingStartedAt: string | null;
  items: Array<{ id: string; sku: string; title: string; quantity: number }>;
  digitalDeliveries: OrderTrackingDigitalDeliveryFact[];
};

export type OrderTrackingInsertResult =
  | { kind: "inserted"; id: string }
  | { kind: "error" };

export type OrderTrackingStore = {
  insertAccess: (input: {
    orderId: string;
    tokenHash: string;
  }) => Promise<OrderTrackingInsertResult>;
  findAccessByTokenHash: (tokenHash: string) => Promise<OrderTrackingAccessRow | null>;
  findOrderSnapshot: (orderId: string) => Promise<OrderTrackingOrderSnapshot | null>;
  orderHasPhysicalItem: (orderId: string) => Promise<boolean>;
};

export type TimelineStepState = "done" | "current" | "upcoming";

export type OrderTrackingTimelineStep = {
  id: string;
  label: string;
  state: TimelineStepState;
  /** Display-ready date/time under the step title, or null when unknown. */
  occurredAt: string | null;
};

/** Minimized buyer-facing digital delivery state — no tokens, paths, or provider IDs. */
export type PublicDigitalDeliveryStatus =
  | "delivered"
  | "pending"
  | "processing"
  | "failed";

export type OrderTrackingPublicItem = {
  title: string;
  quantity: number;
  kind: "physical" | "digital";
  format: string;
  digitalDeliveryStatus?: PublicDigitalDeliveryStatus;
};

export type OrderTrackingPublicView = {
  friendlyCode: string;
  firstName: string | null;
  statusMessage: string;
  city: string | null;
  region: string | null;
  items: OrderTrackingPublicItem[];
  paymentConfirmed: true;
  fulfillmentStatus: string;
  trackingCode: string | null;
  /** Official Correios tracking URL when code is present and valid; never raw API data. */
  correiosTrackingUrl: string | null;
  timeline: OrderTrackingTimelineStep[];
};
