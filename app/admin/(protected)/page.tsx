import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { listPhysicalOrders } from "@/lib/admin/order-store";
import {
  adminPageCount,
  formatAdminDateTime,
  formatAdminMoney,
  fulfillmentStatusLabel,
  parseAdminPage,
  paymentStatusLabel,
  physicalQuantityLabel,
} from "@/lib/admin/orders";

export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

function pageParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const access = await resolveAdminAccess();
  if (!access.ok) {
    if (access.reason === "anonymous") {
      redirect("/admin/login");
    }
    return null;
  }

  const params = await searchParams;
  const page = parseAdminPage(pageParam(params.page));

  let result: Awaited<ReturnType<typeof listPhysicalOrders>>;
  try {
    result = await listPhysicalOrders(page);
  } catch {
    return (
      <p className="font-sans text-base text-ink-soft">Não foi possível carregar os pedidos agora.</p>
    );
  }

  const pageCount = adminPageCount(result.total, result.pageSize);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl tracking-tight text-ink">Livro físico</h1>
        <p className="font-sans text-sm text-ink-soft">
          {result.total === 1 ? "1 pedido" : `${result.total} pedidos`}
        </p>
      </div>

      {result.orders.length === 0 ? (
        <p className="mt-10 font-sans text-base text-ink-soft">
          {result.total === 0
            ? "Nenhum pedido com livro físico."
            : "Nenhum pedido nesta página."}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto border border-rule bg-paper-strong">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule font-sans text-[0.7rem] tracking-[0.16em] text-ink-soft uppercase">
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium">Livros</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Envio</th>
              </tr>
            </thead>
            <tbody>
              {result.orders.map((order) => (
                <tr key={order.id} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-sans text-sm font-medium tracking-wide text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      {order.friendlyCode}
                    </Link>
                    {order.hasEbook ? (
                      <p className="mt-1 font-sans text-xs tracking-wide text-ink-soft">+ E-book</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm text-ink">
                    {formatAdminDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm text-ink">{order.buyerName}</td>
                  <td className="px-4 py-4 font-sans text-sm text-ink">
                    {physicalQuantityLabel(order.physicalQuantity)}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm tabular-nums text-ink">
                    {formatAdminMoney(order.totalCents)}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm text-ink">
                    {paymentStatusLabel(order.paymentStatus)}
                  </td>
                  <td className="px-4 py-4 font-sans text-sm text-ink">
                    {fulfillmentStatusLabel(order.fulfillmentStatus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <nav className="mt-6 flex items-center justify-between gap-4 font-sans text-sm text-ink">
          {page > 1 ? (
            <Link
              href={page === 2 ? "/admin" : `/admin?page=${page - 1}`}
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <p className="text-ink-soft">
            Página {page} de {pageCount}
          </p>
          {page < pageCount ? (
            <Link
              href={`/admin?page=${page + 1}`}
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}
