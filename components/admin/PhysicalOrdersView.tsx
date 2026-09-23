import { AdminLoadError, AdminPageHeader } from "@/components/admin/AdminChrome";
import { FilterChips } from "@/components/admin/FilterChips";
import { AdminDataList, OrderCodeLink, OrderViewLink } from "@/components/admin/OrderTable";
import { AdminPagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { physicalPageTitle, type ShipmentFilter } from "@/lib/admin/catalog";
import { requireAdminPage } from "@/lib/admin/guard";
import { adminPageCount, formatAdminDateTime, formatAdminMoney, physicalQuantityLabel } from "@/lib/admin/orders";
import { physicalListPath, withPage } from "@/lib/admin/paths";
import { listFilteredPhysicalOrders } from "@/lib/admin/queries";

export async function PhysicalOrdersView({
  filter,
  page,
}: {
  filter: ShipmentFilter;
  page: number;
}) {
  if (!(await requireAdminPage())) {
    return null;
  }

  const result = await listFilteredPhysicalOrders(page, filter);
  if (!result) {
    return <AdminLoadError />;
  }

  const pageCount = adminPageCount(result.total, result.pageSize);
  const title = physicalPageTitle(filter);
  const description =
    filter === "awaiting"
      ? "Livros físicos com pagamento aprovado e envio ainda não feito. Os mais antigos aparecem primeiro."
      : "Pedidos que contêm o livro físico, inclusive quando o e-book foi junto.";

  return (
    <section>
      <AdminPageHeader
        title={title}
        description={description}
        meta={result.total === 1 ? "1 pedido" : `${result.total} pedidos`}
      />
      <FilterChips
        items={(
          [
            ["all", "Todos"],
            ["awaiting", "Aguardando envio"],
            ["shipped", "Postados"],
            ["delivered", "Entregues"],
          ] as const
        ).map(([item, label]) => ({
          href: physicalListPath(item),
          label,
          active: item === filter,
        }))}
      />
      <AdminDataList
        rows={result.rows}
        empty={result.total === 0 ? "Nenhum pedido com livro físico neste filtro." : "Nenhum pedido nesta página."}
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
            key: "books",
            header: "Livros",
            cell: (order) => physicalQuantityLabel(order.physicalQuantity),
          },
          {
            key: "ebook",
            header: "E-book junto",
            cell: (order) => (order.hasEbook ? "Sim" : "Não"),
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
            header: "Envio",
            cell: (order) => <StatusBadge kind="fulfillment" status={order.fulfillmentStatus} />,
          },
          {
            key: "tracking",
            header: "Rastreio",
            cell: (order) => order.trackingCode ?? "—",
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
        hrefFor={(nextPage) => withPage(physicalListPath(filter), nextPage)}
      />
    </section>
  );
}
