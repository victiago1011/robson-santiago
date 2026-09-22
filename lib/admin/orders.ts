import { formatBRLFromCents } from "@/lib/commerce/money";
import { DIGITAL_SKU, PHYSICAL_SKU } from "@/lib/commerce/selection";

export const ADMIN_ORDERS_PAGE_SIZE = 20;

export type AdminOrderListItem = {
  id: string;
  friendlyCode: string;
  createdAt: string;
  buyerName: string;
  physicalQuantity: number;
  hasEbook: boolean;
  totalCents: number | null;
  paymentStatus: string;
  fulfillmentStatus: string;
};

export type AdminOrderItem = {
  sku: string;
  title: string;
  quantity: number;
  unitPriceCents: number | null;
  totalPriceCents: number | null;
};

export type AdminOrderDetail = {
  id: string;
  friendlyCode: string;
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
  physicalQuantity: number;
  hasEbook: boolean;
  items: AdminOrderItem[];
};

export type AdminOrderSource = {
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
  promotionCode: string | null;
  items: AdminOrderItem[];
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Aguardando pagamento",
  approved: "Pago",
  rejected: "Pagamento recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  pending: "Aguardando preparação",
  preparing: "Preparando",
  shipped: "Postado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function friendlyOrderCode(publicId: string): string {
  const compact = publicId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `#${compact}`;
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_LABELS[status] ?? status;
}

export function fulfillmentStatusLabel(status: string): string {
  return FULFILLMENT_LABELS[status] ?? status;
}

export function formatAdminMoney(cents: number | null): string {
  if (cents === null) {
    return "—";
  }
  return formatBRLFromCents(cents);
}

export function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function formatAdminZip(zip: string | null): string {
  if (!zip?.trim()) {
    return "—";
  }
  const digits = zip.replace(/\D/g, "");
  if (digits.length !== 8) {
    return zip;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function physicalQuantityLabel(quantity: number): string {
  return quantity === 1 ? "1 livro" : `${quantity} livros`;
}

export function formatAdminDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function parseAdminPage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }
  return Math.min(page, 10_000);
}

export function adminPageWindow(page: number, pageSize = ADMIN_ORDERS_PAGE_SIZE) {
  const safePage = page < 1 ? 1 : page;
  return {
    page: safePage,
    pageSize,
    limit: pageSize,
    offset: (safePage - 1) * pageSize,
  };
}

export function adminPageCount(total: number, pageSize = ADMIN_ORDERS_PAGE_SIZE): number {
  if (total <= 0) {
    return 1;
  }
  return Math.ceil(total / pageSize);
}

export function orderHasPhysicalBook(items: { sku: string }[]): boolean {
  return items.some((item) => item.sku === PHYSICAL_SKU);
}

export function orderHasEbook(items: { sku: string }[]): boolean {
  return items.some((item) => item.sku === DIGITAL_SKU);
}

export function physicalQuantity(items: { sku: string; quantity: number }[]): number {
  return items.reduce(
    (sum, item) => (item.sku === PHYSICAL_SKU ? sum + item.quantity : sum),
    0,
  );
}

export function toAdminOrderDetail(order: AdminOrderSource): AdminOrderDetail | null {
  if (!orderHasPhysicalBook(order.items)) {
    return null;
  }

  const hasEbook = orderHasEbook(order.items);
  return {
    id: order.id,
    friendlyCode: friendlyOrderCode(order.publicId),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    buyerName: order.buyerName,
    email: order.email,
    phone: order.phone,
    document: order.document,
    zip: order.zip,
    street: order.street,
    number: order.number,
    complement: order.complement,
    district: order.district,
    city: order.city,
    state: order.state,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    physicalQuantity: physicalQuantity(order.items),
    hasEbook,
    items: order.items,
  };
}

export function paginatePhysicalOrders(
  orders: AdminOrderSource[],
  page: number,
  pageSize = ADMIN_ORDERS_PAGE_SIZE,
): { total: number; page: number; pageSize: number; orders: AdminOrderListItem[] } {
  const physical = orders
    .filter((order) => orderHasPhysicalBook(order.items))
    .slice()
    .sort((left, right) => {
      const byDate = right.createdAt.localeCompare(left.createdAt);
      if (byDate !== 0) {
        return byDate;
      }
      return right.id.localeCompare(left.id);
    });

  const window = adminPageWindow(page, pageSize);
  const slice = physical.slice(window.offset, window.offset + window.limit);

  return {
    total: physical.length,
    page: window.page,
    pageSize,
    orders: slice.map((order) => ({
      id: order.id,
      friendlyCode: friendlyOrderCode(order.publicId),
      createdAt: order.createdAt,
      buyerName: order.buyerName,
      physicalQuantity: physicalQuantity(order.items),
      hasEbook: orderHasEbook(order.items),
      totalCents: order.totalCents,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
    })),
  };
}

export function itemDisplayName(sku: string, title: string): string {
  if (sku === PHYSICAL_SKU) {
    return "Livro físico";
  }
  if (sku === DIGITAL_SKU) {
    return "E-book";
  }
  return title;
}
