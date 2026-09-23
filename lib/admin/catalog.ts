import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  adminPageWindow,
  orderHasEbook,
  orderHasPhysicalBook,
  paymentStatusLabel,
  physicalQuantity,
} from "@/lib/admin/orders";

export const ATTENTION_PREVIEW_LIMIT = 8;
export const ADMIN_FACT_PAGE_SIZE = 1000;

export type ShipmentFilter = "all" | "awaiting" | "shipped" | "delivered";

export type PaymentListFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "declined";

export type OrderComposition = "all" | "physical" | "ebook" | "both";

export type CatalogPaymentFilter = Exclude<PaymentListFilter, "declined">;

export type AdminFactItem = {
  sku: string;
  quantity: number;
};

export type AdminOrderFact = {
  id: string;
  totalCents: number | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  paidAt: string | null;
  createdAt: string;
  items: AdminFactItem[];
};

export type AdminMetrics = {
  paidOrders: number;
  physicalBooksSold: number;
  ebooksSold: number;
  awaitingShipment: number;
  shipped: number;
  delivered: number;
  pendingPayments: number;
  declinedPayments: number;
  approvedRevenueCents: number | null;
  pendingRevenueCents: number | null;
  declinedRevenueCents: number | null;
};

export type NavCounts = {
  awaitingShipment: number;
  pendingPayments: number;
  declinedPayments: number;
};

export type DeliveryFact = {
  emailStatus: string;
  providerAcceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const EVENT_LABELS: Record<string, string> = {
  order_created: "Pedido criado",
  payment_attempted: "Tentativa de pagamento",
  payment_webhook_received: "Webhook de pagamento",
  payment_reconciled: "Pagamento reconciliado",
  payment_reconciliation_failed: "Falha na reconciliação",
  payment_amount_mismatch: "Valor divergente",
};

const REASON_LABELS: Record<string, string> = {
  ambiguous_payment_attempt: "Tentativa ambígua",
  provider_order_mismatch: "Pedido do provedor divergente",
  currency_mismatch: "Moeda divergente",
  amount_mismatch: "Valor divergente",
};

export function matchesShipmentFilter(
  order: {
    paymentStatus: string;
    fulfillmentStatus: string;
    items: { sku: string }[];
  },
  filter: ShipmentFilter,
): boolean {
  if (!orderHasPhysicalBook(order.items)) {
    return false;
  }
  if (filter === "all") {
    return true;
  }
  if (filter === "awaiting") {
    return (
      order.paymentStatus === "approved" &&
      (order.fulfillmentStatus === "pending" || order.fulfillmentStatus === "preparing")
    );
  }
  if (filter === "shipped") {
    return order.fulfillmentStatus === "shipped";
  }
  return order.fulfillmentStatus === "delivered";
}

export function matchesPaymentFilter(paymentStatus: string, filter: PaymentListFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "declined") {
    return paymentStatus === "rejected" || paymentStatus === "cancelled";
  }
  return paymentStatus === filter;
}

export function matchesComposition(
  items: { sku: string }[],
  composition: OrderComposition,
): boolean {
  const physical = orderHasPhysicalBook(items);
  const ebook = orderHasEbook(items);
  if (composition === "all") {
    return true;
  }
  if (composition === "physical") {
    return physical;
  }
  if (composition === "ebook") {
    return ebook;
  }
  return physical && ebook;
}

export function parseOrderComposition(value: string | undefined): OrderComposition {
  if (value === "fisico" || value === "ebook" || value === "ambos") {
    return value === "fisico" ? "physical" : value === "ebook" ? "ebook" : "both";
  }
  return "all";
}

export function compositionParam(composition: OrderComposition): string | undefined {
  if (composition === "physical") {
    return "fisico";
  }
  if (composition === "ebook") {
    return "ebook";
  }
  if (composition === "both") {
    return "ambos";
  }
  return undefined;
}

export function parseCatalogPayment(value: string | undefined): CatalogPaymentFilter {
  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "cancelled" ||
    value === "refunded"
  ) {
    return value;
  }
  return "all";
}

export function ebookOriginLabel(items: { sku: string }[]): string | null {
  if (!orderHasEbook(items)) {
    return null;
  }
  if (orderHasPhysicalBook(items)) {
    return "Adicional ao livro físico";
  }
  return "E-book avulso";
}

export function itemsSummary(items: { sku: string; quantity: number }[]): string {
  const parts: string[] = [];
  const books = physicalQuantity(items);
  if (books > 0) {
    parts.push(books === 1 ? "1 livro" : `${books} livros`);
  }
  if (orderHasEbook(items)) {
    parts.push("E-book");
  }
  return parts.join(" · ") || "—";
}

export function digitalDeliveryCopy(
  paymentStatus: string,
  delivery: DeliveryFact | null,
): { delivery: string; provider: string } {
  if (!delivery) {
    if (paymentStatus === "approved") {
      return { delivery: "Não registrada", provider: "—" };
    }
    return { delivery: "Não iniciada", provider: "—" };
  }

  const provider = delivery.providerAcceptedAt ? "Aceito" : "Ainda não";
  if (delivery.revokedAt) {
    return { delivery: "Revogada", provider };
  }
  if (delivery.emailStatus === "failed") {
    return { delivery: "Falha no e-mail", provider };
  }
  if (delivery.emailStatus === "sent") {
    return { delivery: "Enviado", provider };
  }
  if (delivery.emailStatus === "sending") {
    return { delivery: "Enviando", provider };
  }
  return { delivery: "Pendente", provider };
}

export function chooseDelivery<T extends DeliveryFact>(deliveries: T[]): T | null {
  if (deliveries.length === 0) {
    return null;
  }
  return deliveries
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

function skuQuantity(items: AdminFactItem[], sku: string): number {
  return items.reduce((sum, item) => (item.sku === sku ? sum + item.quantity : sum), 0);
}

function sumKnownTotals(values: Array<number | null>): number | null {
  if (values.length === 0) {
    return 0;
  }
  let sum = 0;
  let seen = false;
  for (const value of values) {
    if (value === null) {
      continue;
    }
    seen = true;
    sum += value;
  }
  return seen ? sum : null;
}

export function deriveMetrics(facts: AdminOrderFact[]): AdminMetrics {
  let paidOrders = 0;
  let physicalBooksSold = 0;
  let ebooksSold = 0;
  let awaitingShipment = 0;
  let shipped = 0;
  let delivered = 0;
  let pendingPayments = 0;
  let declinedPayments = 0;
  const approvedTotals: Array<number | null> = [];
  const pendingTotals: Array<number | null> = [];
  const declinedTotals: Array<number | null> = [];

  for (const fact of facts) {
    if (fact.paymentStatus === "approved") {
      paidOrders += 1;
      physicalBooksSold += skuQuantity(fact.items, PHYSICAL_SKU);
      ebooksSold += skuQuantity(fact.items, DIGITAL_SKU);
      approvedTotals.push(fact.totalCents);
    } else if (fact.paymentStatus === "pending") {
      pendingPayments += 1;
      pendingTotals.push(fact.totalCents);
    } else if (fact.paymentStatus === "rejected" || fact.paymentStatus === "cancelled") {
      declinedPayments += 1;
      declinedTotals.push(fact.totalCents);
    }

    if (matchesShipmentFilter(fact, "awaiting")) {
      awaitingShipment += 1;
    } else if (matchesShipmentFilter(fact, "shipped")) {
      shipped += 1;
    } else if (matchesShipmentFilter(fact, "delivered")) {
      delivered += 1;
    }
  }

  return {
    paidOrders,
    physicalBooksSold,
    ebooksSold,
    awaitingShipment,
    shipped,
    delivered,
    pendingPayments,
    declinedPayments,
    approvedRevenueCents: sumKnownTotals(approvedTotals),
    pendingRevenueCents: sumKnownTotals(pendingTotals),
    declinedRevenueCents: sumKnownTotals(declinedTotals),
  };
}

export function navCounts(metrics: AdminMetrics): NavCounts {
  return {
    awaitingShipment: metrics.awaitingShipment,
    pendingPayments: metrics.pendingPayments,
    declinedPayments: metrics.declinedPayments,
  };
}

export function attentionQueue<T extends AdminOrderFact>(facts: T[], limit: number): T[] {
  return facts
    .filter((fact) => matchesShipmentFilter(fact, "awaiting"))
    .sort((left, right) => {
      const byPaid = (left.paidAt ?? "9999").localeCompare(right.paidAt ?? "9999");
      if (byPaid !== 0) {
        return byPaid;
      }
      const byCreated = left.createdAt.localeCompare(right.createdAt);
      if (byCreated !== 0) {
        return byCreated;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}

export function pageSlice<T>(
  rows: T[],
  page: number,
  pageSize = ADMIN_ORDERS_PAGE_SIZE,
): { total: number; page: number; pageSize: number; rows: T[] } {
  const window = adminPageWindow(page, pageSize);
  return {
    total: rows.length,
    page: window.page,
    pageSize,
    rows: rows.slice(window.offset, window.offset + window.limit),
  };
}

export function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

export function eventDetail(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (record.method === "pix") {
    parts.push("Pix");
  } else if (record.method === "credit_card") {
    parts.push("Cartão");
  }
  if (typeof record.payment_status === "string") {
    parts.push(paymentStatusLabel(record.payment_status));
  } else if (typeof record.mapped_status === "string") {
    parts.push(paymentStatusLabel(record.mapped_status));
  }
  if (typeof record.reason === "string" && REASON_LABELS[record.reason]) {
    parts.push(REASON_LABELS[record.reason]);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function paymentMethodLabel(method: string | null): string {
  if (method === "pix") {
    return "Pix";
  }
  if (method === "credit_card") {
    return "Cartão";
  }
  return "—";
}

export function installmentsLabel(method: string | null, installments: number | null): string | null {
  if (method !== "credit_card" || installments === null || installments < 2) {
    return null;
  }
  return `${installments}x`;
}

export function physicalPageTitle(filter: ShipmentFilter): string {
  if (filter === "awaiting") {
    return "Aguardando envio";
  }
  if (filter === "shipped") {
    return "Postados";
  }
  if (filter === "delivered") {
    return "Entregues";
  }
  return "Livros físicos";
}

export function paymentPageTitle(filter: PaymentListFilter): string {
  if (filter === "pending") {
    return "Aguardando pagamento";
  }
  if (filter === "approved") {
    return "Pagamentos aprovados";
  }
  if (filter === "rejected") {
    return "Recusados";
  }
  if (filter === "cancelled") {
    return "Cancelados";
  }
  if (filter === "refunded") {
    return "Reembolsados";
  }
  if (filter === "declined") {
    return "Recusados / cancelados";
  }
  return "Pagamentos";
}
