import type { Metadata } from "next";
import { AdminLoadError, AdminPageHeader } from "@/components/admin/AdminChrome";
import { FilterChips } from "@/components/admin/FilterChips";
import { AdminDataList, OrderCodeLink, OrderViewLink } from "@/components/admin/OrderTable";
import { AdminPagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  itemsSummary,
  parseCatalogPayment,
  parseOrderComposition,
  paymentPageTitle,
  type CatalogPaymentFilter,
  type OrderComposition,
} from "@/lib/admin/catalog";
import { requireAdminPage } from "@/lib/admin/guard";
import { adminPageCount, formatAdminDateTime, formatAdminMoney, parseAdminPage } from "@/lib/admin/orders";
import { catalogListHref } from "@/lib/admin/paths";
import { listCatalogOrders } from "@/lib/admin/queries";
import { firstSearchParam } from "@/lib/admin/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedidos",
};

type PedidosPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    tipo?: string | string[];
    pagamento?: string | string[];
  }>;
};

const COMPOSITIONS: { id: OrderComposition; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "physical", label: "Com livro físico" },
  { id: "ebook", label: "Com e-book" },
  { id: "both", label: "Físico e e-book" },
];

const PAYMENTS: { id: CatalogPaymentFilter; label: string }[] = [
  { id: "all", label: "Qualquer pagamento" },
  { id: "pending", label: paymentPageTitle("pending") },
  { id: "approved", label: paymentPageTitle("approved") },
  { id: "rejected", label: paymentPageTitle("rejected") },
  { id: "cancelled", label: paymentPageTitle("cancelled") },
  { id: "refunded", label: paymentPageTitle("refunded") },
];

export default async function AdminOrdersPage({ searchParams }: PedidosPageProps) {
  if (!(await requireAdminPage())) {
    return null;
  }

  const params = await searchParams;
  const page = parseAdminPage(firstSearchParam(params.page));
  const composition = parseOrderComposition(firstSearchParam(params.tipo));
  const payment = parseCatalogPayment(firstSearchParam(params.pagamento));
  const result = await listCatalogOrders(page, composition, payment);

  if (!result) {
    return <AdminLoadError />;
  }

  const pageCount = adminPageCount(result.total, result.pageSize);

  return (
    <section>
      <AdminPageHeader
        title="Todos os pedidos"
        description="Livro físico, e-book avulso e os dois no mesmo pedido."
        meta={result.total === 1 ? "1 pedido" : `${result.total} pedidos`}
      />
      <FilterChips
        items={COMPOSITIONS.map((item) => ({
          href: catalogListHref(1, item.id, payment),
          label: item.label,
          active: item.id === composition,
        }))}
      />
      <FilterChips
        items={PAYMENTS.map((item) => ({
          href: catalogListHref(1, composition, item.id),
          label: item.label,
          active: item.id === payment,
        }))}
      />
      <AdminDataList
        rows={result.rows}
        empty={result.total === 0 ? "Nenhum pedido neste filtro." : "Nenhum pedido nesta página."}
        columns={[
          {
            key: "order",
            header: "Pedido",
            cell: (order) => <OrderCodeLink id={order.id} code={order.friendlyCode} />,
          },
          {
            key: "date",
            header: "Data",
            cell: (order) => formatAdminDateTime(order.createdAt),
          },
          {
            key: "buyer",
            header: "Cliente",
            cell: (order) => order.buyerName,
          },
          {
            key: "items",
            header: "Itens",
            cell: (order) => itemsSummary(order.items),
          },
          {
            key: "total",
            header: "Total",
            cell: (order) => formatAdminMoney(order.totalCents),
          },
          {
            key: "payment",
            header: "Pagamento",
            cell: (order) => <StatusBadge kind="payment" status={order.paymentStatus} />,
          },
          {
            key: "shipment",
            header: "Entrega",
            cell: (order) =>
              order.hasPhysical ? (
                <StatusBadge kind="fulfillment" status={order.fulfillmentStatus} />
              ) : (
                "—"
              ),
          },
          {
            key: "action",
            header: "Ação",
            cell: (order) => <OrderViewLink id={order.id} />,
          },
        ]}
      />
      <AdminPagination
        page={result.page}
        pageCount={pageCount}
        hrefFor={(nextPage) => catalogListHref(nextPage, composition, payment)}
      />
    </section>
  );
}
