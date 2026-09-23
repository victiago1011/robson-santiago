import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoadError, AdminPageHeader } from "@/components/admin/AdminChrome";
import { MetricCard } from "@/components/admin/MetricCard";
import { AdminDataList, OrderCodeLink } from "@/components/admin/OrderTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ATTENTION_PREVIEW_LIMIT, deriveMetrics, itemsSummary } from "@/lib/admin/catalog";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatAdminDateTime, formatAdminMoney } from "@/lib/admin/orders";
import { paymentListPath, physicalListPath } from "@/lib/admin/paths";
import { listAttentionOrders, loadAdminOrderFacts } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visão geral",
};

export default async function AdminOverviewPage() {
  if (!(await requireAdminPage())) {
    return null;
  }

  const facts = await loadAdminOrderFacts();
  if (!facts) {
    return <AdminLoadError />;
  }

  const metrics = deriveMetrics(facts);
  const attention = await listAttentionOrders(ATTENTION_PREVIEW_LIMIT);

  return (
    <section>
      <AdminPageHeader
        title="Visão geral"
        description="Pedidos, pagamento e envio do livro. Os números saem dos pedidos já gravados."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <MetricCard
            label="Faturamento aprovado"
            value={formatAdminMoney(metrics.approvedRevenueCents)}
            href={paymentListPath("approved")}
            tone="inverse"
          />
        </div>
        <MetricCard
          label="Pedidos pagos"
          value={String(metrics.paidOrders)}
          href={paymentListPath("approved")}
        />
        <MetricCard
          label="Aguardando envio"
          value={String(metrics.awaitingShipment)}
          href={physicalListPath("awaiting")}
          tone={metrics.awaitingShipment > 0 ? "alert" : "default"}
        />
        <MetricCard
          label="Livros físicos vendidos"
          value={String(metrics.physicalBooksSold)}
          href="/admin/pedidos/fisicos"
        />
        <MetricCard
          label="E-books vendidos"
          value={String(metrics.ebooksSold)}
          href="/admin/pedidos/ebooks"
        />
        <MetricCard
          label="Aguardando pagamento"
          value={formatAdminMoney(metrics.pendingRevenueCents)}
          href={paymentListPath("pending")}
        />
        <MetricCard
          label="Recusados / cancelados"
          value={formatAdminMoney(metrics.declinedRevenueCents)}
          href={paymentListPath("declined")}
        />
      </div>

      <p className="mt-4 font-sans text-sm text-ink-soft">
        <Link
          href={physicalListPath("shipped")}
          className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {metrics.shipped === 1 ? "1 postado" : `${metrics.shipped} postados`}
        </Link>
        <span className="px-2">·</span>
        <Link
          href={physicalListPath("delivered")}
          className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {metrics.delivered === 1 ? "1 entregue" : `${metrics.delivered} entregues`}
        </Link>
      </p>

      <div className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl tracking-tight text-ink">Pedidos que exigem atenção</h2>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft">
              Pagamento aprovado, com livro físico, ainda sem postagem. Os mais antigos vêm primeiro.
            </p>
          </div>
          <Link
            href={physicalListPath("awaiting")}
            className="inline-flex min-h-11 items-center font-sans text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
          >
            Ver fila de envio
          </Link>
        </div>
        {attention === null ? (
          <p className="mt-8 font-sans text-sm text-ink-soft">Não foi possível listar esta fila agora.</p>
        ) : (
          <>
            <AdminDataList
              rows={attention}
              empty="Nenhum livro físico pago aguardando envio."
              columns={[
                {
                  key: "order",
                  header: "Pedido",
                  cell: (order) => <OrderCodeLink id={order.id} code={order.friendlyCode} />,
                },
                {
                  key: "date",
                  header: "Data",
                  cell: (order) => formatAdminDateTime(order.paidAt ?? order.createdAt),
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
                  header: "Envio",
                  cell: (order) => <StatusBadge kind="fulfillment" status={order.fulfillmentStatus} />,
                },
              ]}
            />
            {metrics.awaitingShipment > attention.length ? (
              <p className="mt-4 font-sans text-sm text-ink-soft">
                Mostrando {attention.length} de {metrics.awaitingShipment}.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
