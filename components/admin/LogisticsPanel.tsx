"use client";

import { useActionState } from "react";
import {
  confirmOrderShipment,
  resendAdminPhysicalSaleEmail,
  resendBuyerShippedEmail,
  startOrderPreparation,
} from "@/lib/admin/fulfillment-actions";
import {
  INITIAL_FULFILLMENT_ACTION_STATE,
  type FulfillmentActionState,
} from "@/lib/admin/fulfillment-action-state";
import { formatAdminDateTime, fulfillmentStatusLabel } from "@/lib/admin/orders";
import type { OrderScreen } from "@/lib/admin/order-screen";

const inputClassName =
  "mt-2 w-full min-h-12 rounded-lg border border-rule bg-white px-4 font-sans text-base text-ink focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20";

const buttonClassName =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-ink px-5 font-sans text-sm font-medium tracking-[0.14em] text-paper-strong uppercase hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:cursor-wait disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-rule bg-paper-strong px-4 font-sans text-sm text-ink hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-wait disabled:opacity-60";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-[0.7rem] tracking-[0.16em] text-ink-soft uppercase">{label}</dt>
      <dd className="mt-1 font-sans text-sm break-words text-ink">{value}</dd>
    </div>
  );
}

function ActionFeedback({ state }: { state: FulfillmentActionState }) {
  if (state.ok) {
    return (
      <p role="status" className="mt-3 font-sans text-sm text-ink-soft">
        Atualizado.
      </p>
    );
  }
  if (!state.error) {
    return null;
  }
  return (
    <p role="alert" className="mt-3 font-sans text-sm text-[#8f2d2d]">
      {state.error}
    </p>
  );
}

function StartPreparationForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    startOrderPreparation,
    INITIAL_FULFILLMENT_ACTION_STATE,
  );

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="orderId" value={orderId} />
      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Iniciando…" : "Iniciar preparação"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

function ConfirmShipmentForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    confirmOrderShipment,
    INITIAL_FULFILLMENT_ACTION_STATE,
  );

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label
          htmlFor="tracking-code"
          className="font-sans text-[0.7rem] font-medium tracking-[0.18em] text-ink uppercase"
        >
          Código de rastreio dos Correios
        </label>
        <input
          id="tracking-code"
          name="trackingCode"
          type="text"
          autoComplete="off"
          required
          spellCheck={false}
          placeholder="Ex.: AB123456789BR"
          className={inputClassName}
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Confirmando…" : "Confirmar postagem"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

function ResendAdminForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    resendAdminPhysicalSaleEmail,
    INITIAL_FULFILLMENT_ACTION_STATE,
  );

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="orderId" value={orderId} />
      <button type="submit" disabled={pending} className={secondaryButtonClassName}>
        {pending ? "Reenviando…" : "Reenviar notificação"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

function ResendBuyerForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    resendBuyerShippedEmail,
    INITIAL_FULFILLMENT_ACTION_STATE,
  );

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="orderId" value={orderId} />
      <button type="submit" disabled={pending} className={secondaryButtonClassName}>
        {pending ? "Reenviando…" : "Reenviar e-mail de postagem"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function LogisticsPanel({
  orderId,
  logistics,
}: {
  orderId: string;
  logistics: NonNullable<OrderScreen["logistics"]>;
}) {
  const status = logistics.status;
  const paymentApproved = logistics.paymentApproved;

  return (
    <div>
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Status" value={fulfillmentStatusLabel(status)} />
        {logistics.trackingCode ? (
          <Field label="Código de rastreio" value={logistics.trackingCode} />
        ) : null}
        {logistics.shippedAt ? (
          <Field label="Data de postagem" value={formatAdminDateTime(logistics.shippedAt)} />
        ) : null}
      </dl>

      {status === "pending" && paymentApproved ? (
        <div className="mt-5 border-t border-rule pt-5">
          <p className="font-sans text-sm text-ink">Aguardando preparação</p>
          <StartPreparationForm orderId={orderId} />
        </div>
      ) : null}

      {status === "pending" && !paymentApproved ? (
        <p className="mt-5 font-sans text-sm text-ink-soft">
          A preparação só fica disponível após a confirmação do pagamento.
        </p>
      ) : null}

      {status === "preparing" ? (
        <div className="mt-5 border-t border-rule pt-5">
          <p className="font-sans text-sm text-ink">Preparando pedido</p>
          <ConfirmShipmentForm orderId={orderId} />
        </div>
      ) : null}

      {status === "shipped" ? (
        <div className="mt-5 space-y-4 border-t border-rule pt-5">
          <p className="font-sans text-sm text-ink">Postado</p>
          {logistics.buyerShippedEmail ? (
            <div>
              <Field
                label="E-mail ao comprador"
                value={logistics.buyerShippedEmail.statusLabel}
              />
              {logistics.buyerShippedEmail.sentAt ? (
                <p className="mt-2 font-sans text-xs text-ink-soft">
                  Enviado em {formatAdminDateTime(logistics.buyerShippedEmail.sentAt)}
                </p>
              ) : null}
              {logistics.buyerShippedEmail.canResend ? (
                <ResendBuyerForm orderId={orderId} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {status === "delivered" ? (
        <p className="mt-5 font-sans text-sm text-ink-soft">Entregue — somente leitura nesta fase.</p>
      ) : null}

      {logistics.adminSaleEmail && paymentApproved ? (
        <div className="mt-5 border-t border-rule pt-5">
          <Field label="Notificação ao Robinho" value={logistics.adminSaleEmail.statusLabel} />
          {logistics.adminSaleEmail.sentAt ? (
            <p className="mt-2 font-sans text-xs text-ink-soft">
              Enviada em {formatAdminDateTime(logistics.adminSaleEmail.sentAt)}
            </p>
          ) : null}
          {logistics.adminSaleEmail.canResend ? <ResendAdminForm orderId={orderId} /> : null}
        </div>
      ) : null}
    </div>
  );
}
