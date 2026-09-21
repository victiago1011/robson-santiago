import type { OrderPaymentStatus } from "@/lib/payments/status";

export type DigitalDeliveryOrder = {
  id: string;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: string;
};

export type DigitalDeliveryOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  sku: string;
};

export type DigitalDeliveryProduct = {
  id: string;
  type: string;
  digitalFilePath: string | null;
};

export type InsertDigitalDeliveryInput = {
  orderId: string;
  orderItemId: string;
  productId: string;
  tokenHash: string;
};

export type InsertDigitalDeliveryResult = { kind: "inserted" } | { kind: "conflict" };

export type DigitalDeliveryEmailStatus = "pending" | "sending" | "sent" | "failed";

export type DigitalDeliverySendContext = {
  id: string;
  orderId: string;
  orderItemId: string;
  customerEmail: string;
  tokenHash: string;
  emailStatus: DigitalDeliveryEmailStatus;
  emailAttempts: number;
  emailSentAt: string | null;
  emailProviderMessageId: string | null;
  emailProviderAcceptedAt: string | null;
  digitalFilePath: string | null;
  revokedAt: string | null;
};

export type ClaimEmailSendResult =
  | { kind: "claimed"; tokenHash: string; emailAttempts: number }
  | { kind: "already_sent" }
  | { kind: "already_sending" }
  | { kind: "provider_accepted" }
  | { kind: "not_found" }
  | { kind: "revoked" }
  | { kind: "lost_race" };

export type DigitalDeliveryStore = {
  findOrderById: (orderId: string) => Promise<DigitalDeliveryOrder | null>;
  listOrderItems: (orderId: string) => Promise<DigitalDeliveryOrderItem[]>;
  findProductById: (productId: string) => Promise<DigitalDeliveryProduct | null>;
  insertDelivery: (input: InsertDigitalDeliveryInput) => Promise<InsertDigitalDeliveryResult>;
};

export type DigitalDeliveryEmailStore = {
  findSendContextByOrderItemId: (
    orderItemId: string,
  ) => Promise<DigitalDeliverySendContext | null>;
  claimEmailSend: (deliveryId: string, nowMs: number) => Promise<ClaimEmailSendResult>;
  updateTokenHashIfSending: (deliveryId: string, tokenHash: string) => Promise<boolean>;
  recordEmailProviderAccepted: (
    deliveryId: string,
    providerMessageId: string | null,
    acceptedAtMs: number,
  ) => Promise<boolean>;
  markEmailSent: (deliveryId: string, sentAtMs: number) => Promise<boolean>;
  markEmailFailed: (deliveryId: string) => Promise<boolean>;
};

export type DigitalDeliveryDownloadContext = {
  id: string;
  orderId: string;
  orderItemId: string;
  emailStatus: DigitalDeliveryEmailStatus;
  digitalFilePath: string | null;
  revokedAt: string | null;
  downloadCount: number;
  createdAt: string;
  paymentStatus: OrderPaymentStatus;
  firstDownloadedAt: string | null;
  lastDownloadedAt: string | null;
};

export type DigitalDeliveryDownloadStore = {
  findDownloadContextByTokenHash: (
    tokenHash: string,
  ) => Promise<DigitalDeliveryDownloadContext | null>;
  recordDownload: (deliveryId: string, nowMs: number) => Promise<void>;
};
