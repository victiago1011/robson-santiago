import {
  chooseDelivery,
  digitalDeliveryCopy,
  eventDetail,
  eventLabel,
  installmentsLabel,
  paymentMethodLabel,
  type DeliveryFact,
} from "@/lib/admin/catalog";
import {
  orderHasEbook,
  orderHasPhysicalBook,
  paymentStatusLabel,
  type AdminOrderItem,
} from "@/lib/admin/orders";

export type AdminPaymentAttempt = {
  id: string;
  method: string | null;
  status: string;
  statusDetail: string | null;
  installments: number | null;
  amountCents: number | null;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  createdAt: string;
};

export type AdminOrderEvent = {
  id: string;
  eventType: string;
  metadata: unknown;
  createdAt: string;
};

export type AdminDeliveryRow = DeliveryFact & {
  emailSentAt: string | null;
  downloadCount: number;
};

export type AdminOrderRecord = {
  id: string;
  publicId: string;
  createdAt: string;
  paidAt: string | null;
  buyerName: string;
  email: string;
  phone: string;
  document: string;
  zip: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  subtotalCents: number | null;
  discountCents: number;
  shippingCents: number | null;
  totalCents: number | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingCode: string | null;
  shippedAt: string | null;
  items: AdminOrderItem[];
  payments: AdminPaymentAttempt[];
  deliveries: AdminDeliveryRow[];
  events: AdminOrderEvent[];
};

export type OrderScreen = {
  id: string;
  friendlyCode: string;
  createdAt: string;
  paidAt: string | null;
  buyerName: string;
  email: string;
  phone: string;
  document: string;
  address: {
    zip: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
  } | null;
  items: AdminOrderItem[];
  subtotalCents: number | null;
  discountCents: number;
  shippingCents: number | null;
  totalCents: number | null;
  paymentStatus: string;
  fulfillmentStatus: string | null;
  logistics: {
    status: string;
    trackingCode: string | null;
    shippedAt: string | null;
  } | null;
  digital: {
    delivery: string;
    provider: string;
    downloadCount: number | null;
    sentAt: string | null;
  } | null;
  payments: {
    id: string;
    methodLabel: string;
    statusLabel: string;
    statusDetail: string | null;
    installmentsLabel: string | null;
    amountCents: number | null;
    createdAt: string;
    providerPaymentId: string | null;
    providerOrderId: string | null;
  }[];
  events: {
    id: string;
    label: string;
    detail: string | null;
    createdAt: string;
  }[];
};

function attemptStatusLabel(status: string): string {
  if (status === "in_process") {
    return "Em processamento";
  }
  return paymentStatusLabel(status);
}

function trimmed(value: string | null): string | null {
  const text = value?.trim();
  return text ? text : null;
}

export function toOrderScreen(
  order: AdminOrderRecord,
  friendlyCode: string,
): OrderScreen {
  const physical = orderHasPhysicalBook(order.items);
  const ebook = orderHasEbook(order.items);
  const delivery = chooseDelivery(order.deliveries);
  const digitalCopy = ebook ? digitalDeliveryCopy(order.paymentStatus, delivery) : null;

  return {
    id: order.id,
    friendlyCode,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    buyerName: order.buyerName,
    email: order.email,
    phone: order.phone,
    document: order.document,
    address: physical
      ? {
          zip: order.zip,
          street: order.street,
          number: order.number,
          complement: order.complement,
          district: order.district,
          city: order.city,
          state: order.state,
        }
      : null,
    items: order.items,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: physical ? order.fulfillmentStatus : null,
    logistics: physical
      ? {
          status: order.fulfillmentStatus,
          trackingCode: trimmed(order.trackingCode),
          shippedAt: order.shippedAt,
        }
      : null,
    digital: digitalCopy
      ? {
          delivery: digitalCopy.delivery,
          provider: digitalCopy.provider,
          downloadCount: delivery ? delivery.downloadCount : null,
          sentAt: delivery?.emailSentAt ?? null,
        }
      : null,
    payments: order.payments
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((payment) => ({
        id: payment.id,
        methodLabel: paymentMethodLabel(payment.method),
        statusLabel: attemptStatusLabel(payment.status),
        statusDetail: trimmed(payment.statusDetail),
        installmentsLabel: installmentsLabel(payment.method, payment.installments),
        amountCents: payment.amountCents,
        createdAt: payment.createdAt,
        providerPaymentId: trimmed(payment.providerPaymentId),
        providerOrderId: trimmed(payment.providerOrderId),
      })),
    events: order.events
      .slice()
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((event) => ({
        id: event.id,
        label: eventLabel(event.eventType),
        detail: eventDetail(event.metadata),
        createdAt: event.createdAt,
      })),
  };
}
