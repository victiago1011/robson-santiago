import { decimalAmountToCents } from "@/lib/payments/amount";
import { firstTransaction } from "@/lib/payments/public-result";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import {
  canTransitionOrderPaymentStatus,
  canTransitionPaymentAttemptStatus,
  isKnownProviderStatus,
  mapProviderStatus,
  toOrderPaymentStatus,
  type OrderPaymentStatus,
  type PaymentStatus,
} from "@/lib/payments/status";
import type { MercadoPagoOrder } from "@/lib/payments/types";

export type WebhookOrderRecord = {
  id: string;
  publicId: string;
  totalCents: number | null;
  currency: string;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: string;
  paidAt: string | null;
};

export type WebhookPaymentRecord = {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: PaymentStatus;
};

export type WebhookPaymentStore = {
  findOrderByPublicId: (publicId: string) => Promise<WebhookOrderRecord | null>;
  listPaymentsForOrder: (orderId: string) => Promise<WebhookPaymentRecord[]>;
  updatePayment: (input: {
    paymentId: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    status: PaymentStatus;
    statusDetail: string | null;
  }) => Promise<void>;
  updateOrderPaymentStatus: (
    orderId: string,
    paymentStatus: OrderPaymentStatus,
    options?: { paidAt?: string },
  ) => Promise<void>;
  insertEvent: (orderId: string, eventType: string, metadata: Record<string, unknown>) => Promise<void>;
};

export type PaymentAttemptMatch =
  | { kind: "matched"; payment: WebhookPaymentRecord }
  | { kind: "ambiguous" }
  | { kind: "incompatible" }
  | { kind: "missing" };

export type FinancialCheck =
  | { ok: true; amountCents: number; currency: string | null }
  | { ok: false; reason: "amount_mismatch" | "currency_mismatch" | "amount_unavailable" };

export type ReconcileDecision =
  | { action: "provider_incomplete" }
  | { action: "order_not_found"; providerOrderId: string }
  | { action: "ambiguous"; order: WebhookOrderRecord; providerOrderId: string }
  | { action: "incompatible"; order: WebhookOrderRecord; providerOrderId: string }
  | { action: "amount_mismatch"; order: WebhookOrderRecord; payment: WebhookPaymentRecord; metadata: Record<string, unknown> }
  | { action: "skip_unknown_status"; order: WebhookOrderRecord; payment: WebhookPaymentRecord; metadata: Record<string, unknown> }
  | {
      action: "apply";
      order: WebhookOrderRecord;
      payment: WebhookPaymentRecord;
      nextAttemptStatus: PaymentStatus;
      nextOrderStatus: OrderPaymentStatus;
      applyAttempt: boolean;
      applyOrder: boolean;
      metadata: Record<string, unknown>;
    };

const PROVIDER = "mercado_pago";

export function providerCurrency(order: MercadoPagoOrder): string | null {
  const raw = order.currency ?? order.currency_id;
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  return raw.trim().toUpperCase();
}

export function checkFinancialMatch(
  providerOrder: MercadoPagoOrder,
  localOrder: WebhookOrderRecord,
): FinancialCheck {
  const totalCents = decimalAmountToCents(providerOrder.total_amount);
  const paidCents = decimalAmountToCents(providerOrder.total_paid_amount);
  const currency = providerCurrency(providerOrder);

  if (currency && currency !== "BRL") {
    return { ok: false, reason: "currency_mismatch" };
  }
  if (localOrder.currency !== "BRL") {
    return { ok: false, reason: "currency_mismatch" };
  }
  if (totalCents === null || localOrder.totalCents === null) {
    return { ok: false, reason: "amount_unavailable" };
  }
  if (totalCents !== localOrder.totalCents) {
    return { ok: false, reason: "amount_mismatch" };
  }
  if (paidCents !== null && paidCents !== localOrder.totalCents) {
    return { ok: false, reason: "amount_mismatch" };
  }
  return { ok: true, amountCents: totalCents, currency };
}

export function selectPaymentAttempt(
  payments: WebhookPaymentRecord[],
  providerOrderId: string,
): PaymentAttemptMatch {
  const ours = payments.filter((payment) => payment.provider === PROVIDER);
  const exact = ours.filter((payment) => payment.providerOrderId === providerOrderId);
  if (exact.length === 1) {
    return { kind: "matched", payment: exact[0] };
  }
  if (exact.length > 1) {
    return { kind: "ambiguous" };
  }

  const unbound = ours.filter(
    (payment) =>
      payment.providerOrderId === null &&
      (payment.status === "pending" || payment.status === "in_process"),
  );
  if (unbound.length === 1) {
    return { kind: "matched", payment: unbound[0] };
  }
  if (unbound.length > 1) {
    return { kind: "ambiguous" };
  }
  if (ours.length === 0) {
    return { kind: "missing" };
  }
  return { kind: "incompatible" };
}

export function technicalMetadata(input: {
  providerOrderId: string;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  mappedStatus?: PaymentStatus | null;
  extra?: Record<string, unknown>;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    provider: PROVIDER,
    provider_order_id: input.providerOrderId,
    ...(input.providerPaymentId ? { provider_payment_id: input.providerPaymentId } : {}),
    ...(input.providerStatus ? { provider_status: input.providerStatus } : {}),
    ...(input.mappedStatus ? { mapped_status: input.mappedStatus } : {}),
    ...input.extra,
  };
  assertNoSensitiveFields(metadata);
  return metadata;
}

export function decideReconciliation(
  providerOrder: MercadoPagoOrder,
  localOrder: WebhookOrderRecord | null,
  payments: WebhookPaymentRecord[],
): ReconcileDecision {
  const providerOrderId = providerOrder.id?.trim() ?? "";
  const externalReference = providerOrder.external_reference?.trim() ?? "";
  if (!providerOrderId || !externalReference) {
    return { action: "provider_incomplete" };
  }

  if (!localOrder || localOrder.publicId !== externalReference) {
    return { action: "order_not_found", providerOrderId };
  }

  const match = selectPaymentAttempt(
    payments.filter((payment) => payment.orderId === localOrder.id),
    providerOrderId,
  );
  if (match.kind === "ambiguous") {
    return { action: "ambiguous", order: localOrder, providerOrderId };
  }
  if (match.kind === "incompatible" || match.kind === "missing") {
    return { action: "incompatible", order: localOrder, providerOrderId };
  }

  const transaction = firstTransaction(providerOrder);
  const providerStatus = transaction?.status ?? providerOrder.status ?? null;
  const mappedStatus = mapProviderStatus(providerStatus);
  const metadata = technicalMetadata({
    providerOrderId,
    providerPaymentId: transaction?.id ?? null,
    providerStatus,
    mappedStatus,
  });

  if (!isKnownProviderStatus(providerStatus) || !providerStatus) {
    return {
      action: "skip_unknown_status",
      order: localOrder,
      payment: match.payment,
      metadata,
    };
  }

  const nextOrderStatus = toOrderPaymentStatus(mappedStatus);
  if (nextOrderStatus === "approved") {
    const financial = checkFinancialMatch(providerOrder, localOrder);
    if (!financial.ok) {
      return {
        action: "amount_mismatch",
        order: localOrder,
        payment: match.payment,
        metadata: technicalMetadata({
          providerOrderId,
          providerPaymentId: transaction?.id ?? null,
          providerStatus,
          mappedStatus,
          extra: { reason: financial.reason },
        }),
      };
    }
  }

  const applyAttempt = canTransitionPaymentAttemptStatus(match.payment.status, mappedStatus);
  const applyOrder = canTransitionOrderPaymentStatus(localOrder.paymentStatus, nextOrderStatus);

  return {
    action: "apply",
    order: localOrder,
    payment: match.payment,
    nextAttemptStatus: applyAttempt ? mappedStatus : match.payment.status,
    nextOrderStatus: applyOrder ? nextOrderStatus : localOrder.paymentStatus,
      applyAttempt,
      applyOrder,
      metadata,
    };
}

export async function persistReconciliation(
  store: WebhookPaymentStore,
  providerOrder: MercadoPagoOrder,
  decision: Extract<ReconcileDecision, { action: "apply" }>,
  nowMs: number = Date.now(),
): Promise<void> {
  const transaction = firstTransaction(providerOrder);
  const statusDetail = transaction?.status_detail ?? providerOrder.status_detail ?? null;
  const nextProviderOrderId = providerOrder.id?.trim() ?? decision.payment.providerOrderId;
  const nextProviderPaymentId = transaction?.id ?? decision.payment.providerPaymentId;

  const paymentUnchanged =
    decision.payment.providerOrderId === nextProviderOrderId &&
    decision.payment.providerPaymentId === nextProviderPaymentId &&
    decision.payment.status === decision.nextAttemptStatus;
  const orderUnchanged = decision.order.paymentStatus === decision.nextOrderStatus;

  if (paymentUnchanged && orderUnchanged) {
    return;
  }

  if (!paymentUnchanged) {
    await store.updatePayment({
      paymentId: decision.payment.id,
      providerOrderId: nextProviderOrderId,
      providerPaymentId: nextProviderPaymentId,
      status: decision.nextAttemptStatus,
      statusDetail,
    });
  }

  if (!orderUnchanged && decision.applyOrder) {
    const enteringApproved =
      decision.nextOrderStatus === "approved" && decision.order.paymentStatus !== "approved";
    const paidAt =
      enteringApproved && !decision.order.paidAt ? new Date(nowMs).toISOString() : undefined;
    await store.updateOrderPaymentStatus(decision.order.id, decision.nextOrderStatus, {
      ...(paidAt ? { paidAt } : {}),
    });
  }

  await store.insertEvent(decision.order.id, "payment_webhook_received", decision.metadata);
  await store.insertEvent(decision.order.id, "payment_reconciled", {
    ...decision.metadata,
    payment_status: decision.nextOrderStatus,
    fulfillment_unchanged: true,
  });
}
