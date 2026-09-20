import { DIGITAL_SKU } from "@/lib/commerce/selection";
import { generateDigitalDeliveryToken } from "@/lib/digital-delivery/token";
import type {
  DigitalDeliveryOrderItem,
  DigitalDeliveryStore,
} from "@/lib/digital-delivery/types";

export type DigitalDeliveryEnsureItemResult =
  | { status: "created"; orderItemId: string; rawToken: string }
  | { status: "already_exists"; orderItemId: string }
  | { status: "skipped"; orderItemId?: string; reason: string };

export type EnsureDigitalDeliveriesResult = {
  orderId: string;
  items: DigitalDeliveryEnsureItemResult[];
};

function hasDigitalFilePath(path: string | null | undefined): boolean {
  return typeof path === "string" && path.trim().length > 0;
}

async function ensureItem(
  orderId: string,
  item: DigitalDeliveryOrderItem,
  store: DigitalDeliveryStore,
): Promise<DigitalDeliveryEnsureItemResult> {
  if (item.orderId !== orderId) {
    return { status: "skipped", orderItemId: item.id, reason: "item_order_mismatch" };
  }

  if (item.sku !== DIGITAL_SKU) {
    return { status: "skipped", orderItemId: item.id, reason: "not_digital_sku" };
  }

  const product = await store.findProductById(item.productId);
  if (!product) {
    return { status: "skipped", orderItemId: item.id, reason: "product_not_found" };
  }
  if (product.type !== "digital") {
    return { status: "skipped", orderItemId: item.id, reason: "product_not_digital" };
  }
  if (!hasDigitalFilePath(product.digitalFilePath)) {
    return { status: "skipped", orderItemId: item.id, reason: "missing_digital_file_path" };
  }

  const token = generateDigitalDeliveryToken();
  const inserted = await store.insertDelivery({
    orderId,
    orderItemId: item.id,
    productId: item.productId,
    tokenHash: token.tokenHash,
  });

  if (inserted.kind === "conflict") {
    return { status: "already_exists", orderItemId: item.id };
  }

  return { status: "created", orderItemId: item.id, rawToken: token.rawToken };
}

export async function ensureDigitalDeliveries(
  orderId: string,
  store: DigitalDeliveryStore,
): Promise<EnsureDigitalDeliveriesResult> {
  const order = await store.findOrderById(orderId);
  if (!order) {
    return { orderId, items: [{ status: "skipped", reason: "order_not_found" }] };
  }
  if (order.paymentStatus !== "approved") {
    return { orderId, items: [{ status: "skipped", reason: "payment_not_approved" }] };
  }

  const orderItems = await store.listOrderItems(orderId);
  const items: DigitalDeliveryEnsureItemResult[] = [];

  for (const item of orderItems) {
    items.push(await ensureItem(orderId, item, store));
  }

  return { orderId, items };
}
