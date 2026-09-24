export type OrderTrackingAccessRow = {
  id: string;
  orderId: string;
  tokenHash: string;
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
  items: Array<{ sku: string; title: string; quantity: number }>;
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

export type OrderTrackingPublicView = {
  friendlyCode: string;
  firstName: string | null;
  city: string | null;
  region: string | null;
  items: Array<{ title: string; quantity: number }>;
  paymentConfirmed: true;
  fulfillmentStatus: string;
  trackingCode: string | null;
  timeline: OrderTrackingTimelineStep[];
};
