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

export type DigitalDeliveryStore = {
  findOrderById: (orderId: string) => Promise<DigitalDeliveryOrder | null>;
  listOrderItems: (orderId: string) => Promise<DigitalDeliveryOrderItem[]>;
  findProductById: (productId: string) => Promise<DigitalDeliveryProduct | null>;
  insertDelivery: (input: InsertDigitalDeliveryInput) => Promise<InsertDigitalDeliveryResult>;
};
