import { AdminLoadError, AdminPageHeader } from "@/components/admin/AdminChrome";
import { FilterChips } from "@/components/admin/FilterChips";
import { AdminDataList, OrderCodeLink, OrderViewLink } from "@/components/admin/OrderTable";
import { AdminPagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { paymentPageTitle, type PaymentListFilter } from "@/lib/admin/catalog";
import { requireAdminPage } from "@/lib/admin/guard";
import { adminPageCount, formatAdminDateTime, formatAdminMoney } from "@/lib/admin/orders";
import { paymentListPath, withPage } from "@/lib/admin/paths";
import { listPaymentOrders } from "@/lib/admin/queries";

const FILTERS = [
  "all",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
] as const satisfies readonly PaymentListFilter[];

export async function PaymentsView({
  filter,
  page,
}: {
  filter: PaymentListFilter;
  page: number;
}) {
  if (!(await requireAdminPage())) {
    return null;
  }

  const result = await listPaymentOrders(page, filter);
  if (!result) {
    return <AdminLoadError />;
  }

  const pageCount = adminPageCount(result.total, result.pageSize);

  return (
    <section>
      <AdminPageHeader
        title={paymentPageTitle(filter)}
        description="O status é o do pedido, gravado pela reconciliação. Uma tentativa individual não substitui esse status."
        meta={result.total === 1 ? "1 pedido" : `${result.total} pedidos`}
      />
      <FilterChips
        items={FILTERS.map((item) => ({
          href: paymentListPath(item),
          label: item === "all" ? "Todos" : paymentPageTitle(item),
          active: item === filter,
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
            key: "buyer",
            header: "Comprador",
            cell: (order) => order.buyerName,
          },
          {
            key: "date",
            header: "Data",
            cell: (order) => formatAdminDateTime(order.createdAt),
          },
          {
            key: "total",
            header: "Valor",
            cell: (order) => formatAdminMoney(order.totalCents),
          },
          {
            key: "payment",
            header: "Status",
            cell: (order) => <StatusBadge kind="payment" status={order.paymentStatus} />,
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
        hrefFor={(nextPage) => withPage(paymentListPath(filter), nextPage)}
      />
    </section>
  );
}
