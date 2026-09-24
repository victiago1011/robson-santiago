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
  timeline: OrderTrackingTimelineStep[];
};
