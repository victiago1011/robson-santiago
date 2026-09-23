export type OrderEmailNotificationKind = "admin_physical_sale" | "buyer_shipped";

export type OrderEmailNotificationStatus = "pending" | "sending" | "sent" | "failed";

export type OrderEmailNotificationRow = {
  id: string;
  orderId: string;
  kind: OrderEmailNotificationKind;
  status: OrderEmailNotificationStatus;
  attempts: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
  providerAcceptedAt: string | null;
};

export type ClaimOrderEmailSendResult =
  | { kind: "claimed"; notificationId: string; attempts: number }
  | { kind: "already_sent"; notificationId: string }
  | { kind: "already_sending"; notificationId: string }
  | { kind: "provider_accepted"; notificationId: string }
  | { kind: "not_found" }
  | { kind: "lost_race" };

export type EnsureOrderEmailNotificationResult =
  | { status: "created"; notificationId: string }
  | { status: "already_exists"; notificationId: string }
  | { status: "skipped"; reason: string };

export type AdminPhysicalSaleOrderContext = {
  orderId: string;
  publicId: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  totalCents: number | null;
  paidAt: string | null;
  shippingZip: string | null;
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingComplement: string | null;
  shippingDistrict: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  items: Array<{ sku: string; quantity: number; title: string }>;
};

export type BuyerShippedOrderContext = {
  orderId: string;
  publicId: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerEmail: string;
  customerName: string;
  trackingCode: string | null;
  shippedAt: string | null;
  items: Array<{ sku: string; quantity: number }>;
};

export type OrderEmailNotificationStore = {
  findNotification: (
    orderId: string,
    kind: OrderEmailNotificationKind,
  ) => Promise<OrderEmailNotificationRow | null>;
  insertNotification: (
    orderId: string,
    kind: OrderEmailNotificationKind,
  ) => Promise<{ kind: "inserted"; id: string } | { kind: "conflict"; id: string } | { kind: "error" }>;
  claimEmailSend: (notificationId: string, nowMs: number) => Promise<ClaimOrderEmailSendResult>;
  recordProviderAccepted: (
    notificationId: string,
    providerMessageId: string | null,
    acceptedAtMs: number,
  ) => Promise<boolean>;
  markSent: (notificationId: string, sentAtMs: number) => Promise<boolean>;
  markFailed: (notificationId: string) => Promise<boolean>;
  findAdminPhysicalSaleContext: (orderId: string) => Promise<AdminPhysicalSaleOrderContext | null>;
  findBuyerShippedContext: (orderId: string) => Promise<BuyerShippedOrderContext | null>;
  insertOrderEvent: (
    orderId: string,
    eventType: string,
    metadata: Record<string, unknown>,
  ) => Promise<void>;
};
