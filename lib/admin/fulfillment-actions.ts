"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveAdminAccess } from "@/lib/admin/guard";
import {
  decideConfirmShipment,
  decideStartPreparation,
} from "@/lib/admin/fulfillment";
import type { FulfillmentActionState } from "@/lib/admin/fulfillment-action-state";
import {
  casConfirmShipment,
  casStartPreparing,
  insertFulfillmentEvent,
  loadFulfillmentOrder,
} from "@/lib/admin/fulfillment-store";
import { notifyBuyerShipped } from "@/lib/notifications/notify-buyer-shipped";
import { notifyAdminPhysicalSale } from "@/lib/notifications/notify-admin-physical-sale";
import { supabaseOrderEmailNotificationStore } from "@/lib/notifications/store";
import { ORDER_EMAIL_STALE_CLAIM_MS, isStaleSendingClaim } from "@/lib/notifications/stale";

const UNAUTHORIZED = "Acesso não autorizado.";
const UNAVAILABLE = "Não foi possível concluir agora.";
const INVALID_ORDER = "Pedido inválido.";
const INVALID_STATE = "Esta ação não está disponível para o estado atual do pedido.";
const INVALID_TRACKING = "Informe um código de rastreio válido dos Correios.";

function fail(error: string, code: string): FulfillmentActionState {
  return { ok: false, error, code };
}

function success(): FulfillmentActionState {
  return { ok: true, error: null, code: null };
}

async function requireAdminMutation(): Promise<
  { ok: true } | { ok: false; state: FulfillmentActionState }
> {
  const access = await resolveAdminAccess();
  if (!access.ok) {
    if (access.reason === "unavailable") {
      return { ok: false, state: fail(UNAVAILABLE, "UNAVAILABLE") };
    }
    return { ok: false, state: fail(UNAUTHORIZED, "UNAUTHORIZED") };
  }
  return { ok: true };
}

function parseOrderId(formData: FormData): string | null {
  const raw = String(formData.get("orderId") ?? "").trim();
  if (!z.uuid().safeParse(raw).success) {
    return null;
  }
  return raw;
}

function revalidateOrder(orderId: string): void {
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/pedidos/fisicos");
  revalidatePath("/admin/logistica/aguardando-envio");
  revalidatePath("/admin/logistica/postados");
}

export async function startOrderPreparation(
  _prev: FulfillmentActionState,
  formData: FormData,
): Promise<FulfillmentActionState> {
  const auth = await requireAdminMutation();
  if (!auth.ok) {
    return auth.state;
  }

  const orderId = parseOrderId(formData);
  if (!orderId) {
    return fail(INVALID_ORDER, "INVALID_ORDER");
  }

  try {
    const order = await loadFulfillmentOrder(orderId);
    if (!order) {
      return fail(INVALID_ORDER, "ORDER_NOT_FOUND");
    }

    const decision = decideStartPreparation(order);
    if (!decision.ok) {
      return fail(INVALID_STATE, decision.code);
    }

    const updated = await casStartPreparing(orderId);
    if (!updated) {
      return fail(INVALID_STATE, "CONFLICT");
    }

    await insertFulfillmentEvent(orderId, "fulfillment_preparing_started", {});
    revalidateOrder(orderId);
    return success();
  } catch {
    return fail(UNAVAILABLE, "STORE_ERROR");
  }
}

export async function confirmOrderShipment(
  _prev: FulfillmentActionState,
  formData: FormData,
): Promise<FulfillmentActionState> {
  const auth = await requireAdminMutation();
  if (!auth.ok) {
    return auth.state;
  }

  const orderId = parseOrderId(formData);
  if (!orderId) {
    return fail(INVALID_ORDER, "INVALID_ORDER");
  }

  const rawTracking = String(formData.get("trackingCode") ?? "");

  try {
    const order = await loadFulfillmentOrder(orderId);
    if (!order) {
      return fail(INVALID_ORDER, "ORDER_NOT_FOUND");
    }

    const decision = decideConfirmShipment(order, rawTracking);
    if (!decision.ok) {
      if (decision.code === "INVALID_TRACKING_CODE") {
        return fail(INVALID_TRACKING, decision.code);
      }
      return fail(INVALID_STATE, decision.code);
    }

    const shippedAtIso = new Date().toISOString();
    const updated = await casConfirmShipment(orderId, decision.trackingCode, shippedAtIso);
    if (!updated) {
      return fail(INVALID_STATE, "CONFLICT");
    }

    await insertFulfillmentEvent(orderId, "fulfillment_shipped", {
      tracking_code: decision.trackingCode,
    });

    try {
      await notifyBuyerShipped(orderId, supabaseOrderEmailNotificationStore);
    } catch {
      console.error("buyer_shipped_notify_failed", { code: "NOTIFY_UNEXPECTED_ERROR" });
    }

    revalidateOrder(orderId);
    return success();
  } catch {
    return fail(UNAVAILABLE, "STORE_ERROR");
  }
}

export async function resendAdminPhysicalSaleEmail(
  _prev: FulfillmentActionState,
  formData: FormData,
): Promise<FulfillmentActionState> {
  const auth = await requireAdminMutation();
  if (!auth.ok) {
    return auth.state;
  }

  const orderId = parseOrderId(formData);
  if (!orderId) {
    return fail(INVALID_ORDER, "INVALID_ORDER");
  }

  try {
    const notification = await supabaseOrderEmailNotificationStore.findNotification(
      orderId,
      "admin_physical_sale",
    );
    if (!notification) {
      const result = await notifyAdminPhysicalSale(orderId, supabaseOrderEmailNotificationStore);
      revalidateOrder(orderId);
      if (result.status === "sent" || result.status === "already_sent") {
        return success();
      }
      if (result.status === "failed") {
        return fail("Não foi possível reenviar a notificação.", result.code);
      }
      return fail(INVALID_STATE, result.status === "skipped" ? result.reason : result.status);
    }

    const nowMs = Date.now();
    const canResend =
      notification.status === "failed" ||
      (notification.status === "sending" &&
        isStaleSendingClaim(notification.lastAttemptAt, nowMs, ORDER_EMAIL_STALE_CLAIM_MS)) ||
      notification.status === "pending";

    if (notification.status === "sent" || notification.providerAcceptedAt) {
      return fail("A notificação já foi enviada.", "ALREADY_SENT");
    }
    if (!canResend && notification.status === "sending") {
      return fail(
        "O envio ainda está em andamento. Tente novamente em alguns minutos.",
        "ALREADY_SENDING",
      );
    }

    const result = await notifyAdminPhysicalSale(orderId, supabaseOrderEmailNotificationStore);
    revalidateOrder(orderId);
    if (result.status === "sent" || result.status === "already_sent") {
      return success();
    }
    if (result.status === "failed") {
      return fail("Não foi possível reenviar a notificação.", result.code);
    }
    return fail(INVALID_STATE, result.status === "skipped" ? result.reason : result.status);
  } catch {
    return fail(UNAVAILABLE, "STORE_ERROR");
  }
}

export async function resendBuyerShippedEmail(
  _prev: FulfillmentActionState,
  formData: FormData,
): Promise<FulfillmentActionState> {
  const auth = await requireAdminMutation();
  if (!auth.ok) {
    return auth.state;
  }

  const orderId = parseOrderId(formData);
  if (!orderId) {
    return fail(INVALID_ORDER, "INVALID_ORDER");
  }

  try {
    const order = await loadFulfillmentOrder(orderId);
    if (!order || order.fulfillmentStatus !== "shipped") {
      return fail(INVALID_STATE, "NOT_SHIPPED");
    }

    const notification = await supabaseOrderEmailNotificationStore.findNotification(
      orderId,
      "buyer_shipped",
    );
    if (notification) {
      const nowMs = Date.now();
      if (notification.status === "sent" || notification.providerAcceptedAt) {
        return fail("O e-mail de postagem já foi enviado.", "ALREADY_SENT");
      }
      if (
        notification.status === "sending" &&
        !isStaleSendingClaim(notification.lastAttemptAt, nowMs, ORDER_EMAIL_STALE_CLAIM_MS)
      ) {
        return fail(
          "O envio ainda está em andamento. Tente novamente em alguns minutos.",
          "ALREADY_SENDING",
        );
      }
    }

    const result = await notifyBuyerShipped(orderId, supabaseOrderEmailNotificationStore);
    revalidateOrder(orderId);
    if (result.status === "sent" || result.status === "already_sent") {
      return success();
    }
    if (result.status === "failed") {
      return fail("Não foi possível reenviar o e-mail ao comprador.", result.code);
    }
    return fail(INVALID_STATE, result.status === "skipped" ? result.reason : result.status);
  } catch {
    return fail(UNAVAILABLE, "STORE_ERROR");
  }
}
