import { getMercadoPagoWebhookSecret } from "@/lib/payments/config";
import {
  classifyGetOrderError,
  providerUnavailableLog,
} from "@/lib/payments/provider-order-error";
import {
  decideReconciliation,
  persistReconciliation,
  technicalMetadata,
  type WebhookPaymentStore,
} from "@/lib/payments/reconcile-order";
import type { MercadoPagoOrdersGateway } from "@/lib/payments/types";
import {
  extractWebhookQueryDataId,
  isWebhookTimestampFresh,
  parseSignatureHeader,
  verifyMercadoPagoSignature,
} from "@/lib/payments/webhook-signature";

export type WebhookHandleResult = {
  ok: boolean;
  code: string;
  status: number;
  dataId: string | null;
};

export type WebhookDependencies = {
  getMercadoPago: () => MercadoPagoOrdersGateway;
  store: WebhookPaymentStore;
  ensureDigitalDeliveries: (orderId: string) => Promise<void>;
  now?: () => number;
};

export async function handleMercadoPagoWebhook(
  request: Request,
  env: NodeJS.Dict<string> = process.env,
  deps?: WebhookDependencies,
): Promise<WebhookHandleResult> {
  const secret = getMercadoPagoWebhookSecret(env);
  if (!secret) {
    return { ok: false, code: "WEBHOOK_NOT_CONFIGURED", status: 503, dataId: null };
  }

  const url = new URL(request.url);
  const dataId = extractWebhookQueryDataId(url.searchParams);
  if (!dataId) {
    return { ok: false, code: "MISSING_DATA_ID", status: 400, dataId: null };
  }

  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");

  const valid = verifyMercadoPagoSignature({
    secret,
    signatureHeader: signature,
    requestId,
    dataId,
  });

  if (!valid) {
    return { ok: false, code: "INVALID_SIGNATURE", status: 401, dataId };
  }

  const parsed = parseSignatureHeader(signature);
  const now = deps?.now?.() ?? Date.now();
  if (!parsed || !isWebhookTimestampFresh(parsed.ts, now)) {
    return { ok: false, code: "EXPIRED_SIGNATURE", status: 401, dataId };
  }

  if (!deps) {
    return { ok: false, code: "WEBHOOK_NOT_CONFIGURED", status: 503, dataId };
  }

  let providerOrder;
  try {
    const gateway = deps.getMercadoPago();
    providerOrder = await gateway.getOrder(dataId);
  } catch (error) {
    const classified = classifyGetOrderError(error);
    if (classified === "not_found") {
      return { ok: true, code: "PROVIDER_ORDER_NOT_FOUND", status: 200, dataId };
    }
    if (classified === "invalid_id") {
      return { ok: true, code: "INVALID_PROVIDER_ORDER_ID", status: 200, dataId };
    }
    console.error("webhook_provider_unavailable", providerUnavailableLog(error));
    return { ok: false, code: "PROVIDER_UNAVAILABLE", status: 503, dataId };
  }

  if (!providerOrder?.id || !providerOrder.external_reference) {
    return { ok: true, code: "INCOMPLETE_PROVIDER_ORDER", status: 200, dataId };
  }

  try {
    const localOrder = await deps.store.findOrderByPublicId(providerOrder.external_reference.trim());
    const payments = localOrder ? await deps.store.listPaymentsForOrder(localOrder.id) : [];
    const decision = decideReconciliation(providerOrder, localOrder, payments);

    if (decision.action === "provider_incomplete") {
      return { ok: true, code: "INCOMPLETE_PROVIDER_ORDER", status: 200, dataId };
    }

    if (decision.action === "order_not_found") {
      console.error("webhook_order_not_found", {
        code: "PAYMENT_ORDER_NOT_FOUND",
        provider: "mercado_pago",
        provider_order_id: decision.providerOrderId,
      });
      return { ok: true, code: "PAYMENT_ORDER_NOT_FOUND", status: 200, dataId };
    }

    if (decision.action === "ambiguous") {
      await deps.store.insertEvent(
        decision.order.id,
        "payment_reconciliation_failed",
        technicalMetadata({
          providerOrderId: decision.providerOrderId,
          extra: { reason: "ambiguous_payment_attempt" },
        }),
      );
      return { ok: true, code: "PAYMENT_ATTEMPT_AMBIGUOUS", status: 200, dataId };
    }

    if (decision.action === "incompatible") {
      await deps.store.insertEvent(
        decision.order.id,
        "payment_reconciliation_failed",
        technicalMetadata({
          providerOrderId: decision.providerOrderId,
          extra: { reason: "provider_order_mismatch" },
        }),
      );
      return { ok: true, code: "PROVIDER_ORDER_MISMATCH", status: 200, dataId };
    }

    if (decision.action === "amount_mismatch") {
      await deps.store.updatePayment({
        paymentId: decision.payment.id,
        providerOrderId: providerOrder.id ?? decision.payment.providerOrderId,
        providerPaymentId: decision.payment.providerPaymentId,
        status: decision.payment.status,
        statusDetail: providerOrder.status_detail ?? null,
      });
      await deps.store.insertEvent(decision.order.id, "payment_amount_mismatch", decision.metadata);
      const code =
        decision.metadata.reason === "currency_mismatch"
          ? "PAYMENT_CURRENCY_MISMATCH"
          : "PAYMENT_AMOUNT_MISMATCH";
      return { ok: true, code, status: 200, dataId };
    }

    if (decision.action === "skip_unknown_status") {
      await deps.store.updatePayment({
        paymentId: decision.payment.id,
        providerOrderId: providerOrder.id ?? decision.payment.providerOrderId,
        providerPaymentId: decision.payment.providerPaymentId,
        status: decision.payment.status,
        statusDetail: providerOrder.status_detail ?? null,
      });
      await deps.store.insertEvent(decision.order.id, "payment_webhook_received", decision.metadata);
      return { ok: true, code: "PROVIDER_STATUS_UNKNOWN", status: 200, dataId };
    }

    await persistReconciliation(deps.store, providerOrder, decision, now);

    if (decision.nextOrderStatus === "approved") {
      try {
        await deps.ensureDigitalDeliveries(decision.order.id);
      } catch {
        console.error("digital_delivery_ensure_failed", { code: "DIGITAL_DELIVERY_FAILED" });
        return { ok: false, code: "DIGITAL_DELIVERY_FAILED", status: 503, dataId };
      }
    }

    return { ok: true, code: "RECONCILED", status: 200, dataId };
  } catch {
    console.error("webhook_store_unavailable", { code: "WEBHOOK_STORE_UNAVAILABLE" });
    return { ok: false, code: "WEBHOOK_STORE_UNAVAILABLE", status: 503, dataId };
  }
}
