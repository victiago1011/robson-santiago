import type { Metadata } from "next";
import { AdminLoadError, AdminPageHeader } from "@/components/admin/AdminChrome";
import { AdminDataList, OrderCodeLink, OrderViewLink } from "@/components/admin/OrderTable";
import { AdminPagination } from "@/components/admin/Pagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdminPage } from "@/lib/admin/guard";
import { adminPageCount, formatAdminDateTime, parseAdminPage } from "@/lib/admin/orders";
import { withPage } from "@/lib/admin/paths";
import { listEbookOrders } from "@/lib/admin/queries";
import { firstSearchParam } from "@/lib/admin/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "E-books",
};

type PageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function EbookOrdersPage({ searchParams }: PageProps) {
  if (!(await requireAdminPage())) {
    return null;
  }

  const params = await searchParams;
  const page = parseAdminPage(firstSearchParam(params.page));
  const result = await listEbookOrders(page);
  if (!result) {
    return <AdminLoadError />;
  }

  const pageCount = adminPageCount(result.total, result.pageSize);

  return (
    <section>
      <AdminPageHeader
        title="E-books"
        description="E-book avulso e e-book comprado junto com o livro físico. “Não iniciada” significa que o pagamento ainda não foi aprovado: a entrega digital não foi criada e não houve falha de envio."
        meta={result.total === 1 ? "1 pedido" : `${result.total} pedidos`}
      />
      <AdminDataList
        rows={result.rows}
        empty={result.total === 0 ? "Nenhum pedido com e-book." : "Nenhum pedido nesta página."}
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
            key: "payment",
            header: "Pagamento",
            cell: (order) => <StatusBadge kind="payment" status={order.paymentStatus} />,
          },
          {
            key: "origin",
            header: "Origem",
            cell: (order) => order.originLabel,
          },
          {
            key: "delivery",
            header: "Entrega digital",
            cell: (order) => order.deliveryLabel,
          },
          {
            key: "provider",
            header: "Provedor",
            cell: (order) => order.providerLabel,
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
        hrefFor={(nextPage) => withPage("/admin/pedidos/ebooks", nextPage)}
      />
    </section>
  );
}
