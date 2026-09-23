import type { CatalogPaymentFilter, OrderComposition, PaymentListFilter, ShipmentFilter } from "@/lib/admin/catalog";
import { compositionParam } from "@/lib/admin/catalog";

export function physicalListPath(filter: ShipmentFilter): string {
  if (filter === "awaiting") {
    return "/admin/logistica/aguardando-envio";
  }
  if (filter === "shipped") {
    return "/admin/logistica/postados";
  }
  if (filter === "delivered") {
    return "/admin/logistica/entregues";
  }
  return "/admin/pedidos/fisicos";
}

export function paymentListPath(filter: PaymentListFilter): string {
  if (filter === "pending") {
    return "/admin/pagamentos/aguardando";
  }
  if (filter === "approved") {
    return "/admin/pagamentos/aprovados";
  }
  if (filter === "rejected") {
    return "/admin/pagamentos/recusados";
  }
  if (filter === "cancelled") {
    return "/admin/pagamentos/cancelados";
  }
  if (filter === "refunded") {
    return "/admin/pagamentos/reembolsados";
  }
  if (filter === "declined") {
    return "/admin/pagamentos/recusados-cancelados";
  }
  return "/admin/pagamentos";
}

export function withPage(
  pathname: string,
  page: number,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function catalogListHref(
  page: number,
  composition: OrderComposition,
  payment: CatalogPaymentFilter,
): string {
  return withPage("/admin/pedidos", page, {
    tipo: compositionParam(composition),
    pagamento: payment === "all" ? undefined : payment,
  });
}
