import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import { findPhysicalOrder } from "@/lib/admin/order-store";
import {
  displayText,
  formatAdminDateTime,
  formatAdminMoney,
  formatAdminZip,
  fulfillmentStatusLabel,
  itemDisplayName,
  paymentStatusLabel,
  physicalQuantityLabel,
} from "@/lib/admin/orders";
import { formatCpf } from "@/lib/commerce/cpf";
import { formatBrazilianPhone } from "@/lib/commerce/phone";

export const dynamic = "force-dynamic";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-[0.7rem] tracking-[0.16em] text-ink-soft uppercase">{label}</dt>
      <dd className="mt-1 font-sans text-sm break-words text-ink">{value}</dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const access = await resolveAdminAccess();
  if (!access.ok) {
    if (access.reason === "anonymous") {
      redirect("/admin/login");
    }
    return null;
  }

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  let order: Awaited<ReturnType<typeof findPhysicalOrder>>;
  try {
    order = await findPhysicalOrder(id);
  } catch {
    return (
      <p className="font-sans text-base text-ink-soft">Não foi possível carregar este pedido.</p>
    );
  }

  if (!order) {
    notFound();
  }

  return (
    <article>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center font-sans text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:underline"
      >
        ← Pedidos
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[0.7rem] tracking-[0.18em] text-ink-soft uppercase">Pedido</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">{order.friendlyCode}</h1>
        </div>
        {order.hasEbook ? (
          <p className="font-sans text-sm tracking-wide text-ink-soft">+ E-book</p>
        ) : null}
      </header>

      <section className="mt-8 border border-rule bg-paper-strong p-5 md:p-6">
        <h2 className="font-display text-2xl tracking-tight text-ink">Pedido</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data" value={formatAdminDateTime(order.createdAt)} />
          <Field label="Pagamento" value={paymentStatusLabel(order.paymentStatus)} />
          <Field label="Envio" value={fulfillmentStatusLabel(order.fulfillmentStatus)} />
          <Field label="Pago em" value={formatAdminDateTime(order.paidAt)} />
        </dl>
      </section>

      <section className="mt-6 border border-rule bg-paper-strong p-5 md:p-6">
        <h2 className="font-display text-2xl tracking-tight text-ink">Produtos</h2>
        <p className="mt-2 font-sans text-sm text-ink-soft">
          {physicalQuantityLabel(order.physicalQuantity)}
        </p>
        <ul className="mt-5 divide-y divide-rule">
          {order.items.map((item, index) => (
            <li key={`${item.sku}-${index}`} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
              <div>
                <p className="font-sans text-sm text-ink">{itemDisplayName(item.sku, item.title)}</p>
                <p className="mt-1 font-sans text-xs text-ink-soft">
                  {item.quantity} × {formatAdminMoney(item.unitPriceCents)}
                </p>
              </div>
              <p className="font-sans text-sm tabular-nums text-ink">
                {formatAdminMoney(item.totalPriceCents)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-3 border-t border-rule pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Subtotal" value={formatAdminMoney(order.subtotalCents)} />
          <Field label="Desconto" value={formatAdminMoney(order.discountCents)} />
          <Field label="Frete" value={formatAdminMoney(order.shippingCents)} />
          <Field label="Total" value={formatAdminMoney(order.totalCents)} />
        </dl>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-rule bg-paper-strong p-5 md:p-6">
          <h2 className="font-display text-2xl tracking-tight text-ink">Comprador</h2>
          <dl className="mt-5 grid gap-5">
            <Field label="Nome" value={displayText(order.buyerName)} />
            <Field label="E-mail" value={displayText(order.email)} />
            <Field label="Telefone" value={formatBrazilianPhone(order.phone)} />
            <Field label="CPF" value={formatCpf(order.document)} />
          </dl>
        </div>
        <div className="border border-rule bg-paper-strong p-5 md:p-6">
          <h2 className="font-display text-2xl tracking-tight text-ink">Endereço de entrega</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="CEP" value={formatAdminZip(order.zip)} />
            <Field label="UF" value={displayText(order.state)} />
            <Field label="Rua" value={displayText(order.street)} />
            <Field label="Número" value={displayText(order.number)} />
            <Field label="Complemento" value={displayText(order.complement)} />
            <Field label="Bairro" value={displayText(order.district)} />
            <Field label="Cidade" value={displayText(order.city)} />
          </dl>
        </div>
      </section>
    </article>
  );
}
