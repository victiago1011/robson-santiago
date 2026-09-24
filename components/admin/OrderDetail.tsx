import Link from "next/link";
import type { ReactNode } from "react";
import { LogisticsPanel } from "@/components/admin/LogisticsPanel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { OrderScreen } from "@/lib/admin/order-screen";
import {
  displayText,
  formatAdminDateTime,
  formatAdminMoney,
  formatAdminZip,
  itemDisplayName,
  paymentStatusLabel,
} from "@/lib/admin/orders";
import { formatCpf } from "@/lib/commerce/cpf";
import { formatBrazilianPhone } from "@/lib/commerce/phone";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-[0.7rem] tracking-[0.16em] text-ink-soft uppercase">{label}</dt>
      <dd className="mt-1 font-sans text-sm break-words text-ink">{value}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-rule bg-paper-strong p-5 shadow-[0_1px_2px_rgba(20,20,20,0.04)] md:p-6">
      <h2 className="font-sans text-sm font-medium tracking-[0.14em] text-ink uppercase">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function OrderDetail({ order }: { order: OrderScreen }) {
  return (
    <article>
      <Link
        href="/admin/pedidos"
        className="inline-flex min-h-11 items-center font-sans text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:underline"
      >
        ← Pedidos
      </Link>
      <header className="mt-4">
        <p className="font-sans text-[0.7rem] tracking-[0.18em] text-ink-soft uppercase">Pedido</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">{order.friendlyCode}</h1>
      </header>

      <div className="mt-8 space-y-6">
        <Block title="Pedido">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Número" value={order.friendlyCode} />
            <Field label="Criação" value={formatAdminDateTime(order.createdAt)} />
            <div>
              <dt className="font-sans text-[0.7rem] tracking-[0.16em] text-ink-soft uppercase">Pagamento</dt>
              <dd className="mt-2">
                <StatusBadge kind="payment" status={order.paymentStatus} />
              </dd>
            </div>
            {order.fulfillmentStatus ? (
              <div>
                <dt className="font-sans text-[0.7rem] tracking-[0.16em] text-ink-soft uppercase">Envio</dt>
                <dd className="mt-2">
                  <StatusBadge kind="fulfillment" status={order.fulfillmentStatus} />
                </dd>
              </div>
            ) : (
              <Field label="Envio" value="Sem livro físico" />
            )}
          </dl>
          {order.paidAt ? (
            <p className="mt-5 font-sans text-sm text-ink-soft">
              Pago em {formatAdminDateTime(order.paidAt)}
            </p>
          ) : null}
        </Block>

        {order.logistics ? (
          <Block title="Logística">
            <LogisticsPanel orderId={order.id} logistics={order.logistics} />
          </Block>
        ) : null}

        <Block title="Cliente">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome" value={displayText(order.buyerName)} />
            <Field label="E-mail" value={displayText(order.email)} />
            <Field label="Telefone" value={formatBrazilianPhone(order.phone) || "—"} />
            <Field label="CPF" value={formatCpf(order.document)} />
          </dl>
        </Block>

        <Block title="Itens">
          <ul className="divide-y divide-rule">
            {order.items.map((item, index) => (
              <li
                key={`${item.sku}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-3 py-3"
              >
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
          <dl className="mt-4 grid gap-4 border-t border-rule pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Subtotal" value={formatAdminMoney(order.subtotalCents)} />
            <Field label="Descontos" value={formatAdminMoney(order.discountCents)} />
            <Field label="Frete" value={formatAdminMoney(order.shippingCents)} />
            <Field label="Total" value={formatAdminMoney(order.totalCents)} />
          </dl>
          {order.digital ? (
            <div className="mt-5 border-t border-rule pt-4">
              <p className="font-sans text-[0.7rem] tracking-[0.16em] text-ink-soft uppercase">
                Entrega digital
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Situação" value={order.digital.delivery} />
                <Field label="E-mail no provedor" value={order.digital.provider} />
                {order.digital.downloadCount !== null ? (
                  <Field label="Downloads" value={String(order.digital.downloadCount)} />
                ) : null}
              </dl>
              {order.digital.delivery === "Não iniciada" ? (
                <p className="mt-4 font-sans text-sm leading-relaxed text-ink-soft">
                  A entrega digital só é criada depois que o pagamento é aprovado.
                </p>
              ) : null}
              {order.digital.sentAt ? (
                <p className="mt-4 font-sans text-sm text-ink-soft">
                  E-mail marcado como enviado em {formatAdminDateTime(order.digital.sentAt)}
                </p>
              ) : null}
            </div>
          ) : null}
        </Block>

        {order.address ? (
          <Block title="Endereço de entrega">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Field label="CEP" value={formatAdminZip(order.address.zip)} />
              <Field label="UF" value={displayText(order.address.state)} />
              <Field label="Rua" value={displayText(order.address.street)} />
              <Field label="Número" value={displayText(order.address.number)} />
              <Field label="Complemento" value={displayText(order.address.complement)} />
              <Field label="Bairro" value={displayText(order.address.district)} />
              <Field label="Cidade" value={displayText(order.address.city)} />
            </dl>
          </Block>
        ) : null}

        <Block title="Pagamento">
          <p className="font-sans text-sm text-ink">
            Status do pedido: {paymentStatusLabel(order.paymentStatus)}
          </p>
          {order.payments.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-ink-soft">Nenhuma tentativa registrada.</p>
          ) : (
            <ul className="mt-5 divide-y divide-rule">
              {order.payments.map((payment) => (
                <li key={payment.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="font-sans text-sm text-ink">
                      {payment.methodLabel}
                      {payment.installmentsLabel ? ` · ${payment.installmentsLabel}` : ""}
                    </p>
                    <p className="font-sans text-sm tabular-nums text-ink">
                      {formatAdminMoney(payment.amountCents)}
                    </p>
                  </div>
                  <p className="mt-1 font-sans text-sm text-ink-soft">
                    Tentativa: {payment.statusLabel} · {formatAdminDateTime(payment.createdAt)}
                  </p>
                  {payment.statusDetail ? (
                    <p className="mt-1 font-sans text-xs break-words text-ink-soft">{payment.statusDetail}</p>
                  ) : null}
                  {payment.providerOrderId ? (
                    <p className="mt-2 font-sans text-xs break-all text-ink-soft">
                      Pedido Mercado Pago: {payment.providerOrderId}
                    </p>
                  ) : null}
                  {payment.providerPaymentId ? (
                    <p className="mt-1 font-sans text-xs break-all text-ink-soft">
                      Pagamento Mercado Pago: {payment.providerPaymentId}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Histórico">
          {order.events.length === 0 ? (
            <p className="font-sans text-sm text-ink-soft">Nenhum evento registrado.</p>
          ) : (
            <ol className="space-y-4">
              {order.events.map((event) => (
                <li key={event.id} className="border-l border-rule pl-4">
                  <p className="font-sans text-sm text-ink">{event.label}</p>
                  <p className="mt-1 font-sans text-xs text-ink-soft">
                    {formatAdminDateTime(event.createdAt)}
                    {event.detail ? ` · ${event.detail}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Block>
      </div>
    </article>
  );
}
