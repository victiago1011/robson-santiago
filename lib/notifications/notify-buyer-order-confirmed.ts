import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import { getAppUrl } from "@/lib/email/config";
import {
  claimOrderEmailForSend,
  ensureOrderEmailNotification,
  markOrderEmailFailed,
  markOrderEmailSent,
  recordOrderEmailProviderAccepted,
} from "@/lib/notifications/claim";
import {
  sendBuyerOrderConfirmedEmail,
  type SendBuyerOrderConfirmedEmailResult,
} from "@/lib/notifications/buyer-order-confirmed-email";
import type { OrderEmailNotificationStore } from "@/lib/notifications/types";
import { createOrderTrackingAccess } from "@/lib/order-tracking/create";
import { buildOrderTrackingUrl } from "@/lib/order-tracking/policy";
import type { OrderTrackingStore } from "@/lib/order-tracking/types";

export type NotifyBuyerOrderConfirmedResult =
  | { status: "sent" }
  | { status: "already_sent" }
  | { status: "already_sending" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; code: string }
  | { status: "accepted_unconfirmed" };

export type NotifyBuyerOrderConfirmedDeps = {
  env?: NodeJS.Dict<string>;
  nowMs?: number;
  sendEmail?: (
    ctx: Parameters<typeof sendBuyerOrderConfirmedEmail>[0],
    trackingPageUrl: string,
  ) => Promise<SendBuyerOrderConfirmedEmailResult>;
  markSentAttempts?: number;
  createTrackingAccess?: typeof createOrderTrackingAccess;
};

const DEFAULT_MARK_SENT_ATTEMPTS = 3;

function hasPhysicalBook(items: Array<{ sku: string }>): boolean {
  return items.some((item) => item.sku === PHYSICAL_SKU);
}

async function withRetries(attempts: number, fn: () => Promise<boolean>): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (await fn()) {
        return true;
      }
    } catch {
      console.error("order_email_notification", { code: "EMAIL_STATUS_RETRY" });
    }
  }
  return false;
}

/**
 * Best-effort buyer confirmation after payment approval for physical orders.
 * Creates a new tracking authorization for the CTA. Does not revoke prior tokens.
 * Never throws for handled send failures; webhook wiring must still catch unexpected errors.
 */
export async function notifyBuyerOrderConfirmed(
  orderId: string,
  emailStore: OrderEmailNotificationStore,
  trackingStore: OrderTrackingStore,
  deps: NotifyBuyerOrderConfirmedDeps = {},
): Promise<NotifyBuyerOrderConfirmedResult> {
  const nowMs = deps.nowMs ?? Date.now();
  const markSentAttempts = deps.markSentAttempts ?? DEFAULT_MARK_SENT_ATTEMPTS;
  const env = deps.env ?? process.env;

  const ctx = await emailStore.findBuyerOrderConfirmedContext(orderId);
  if (!ctx) {
    return { status: "skipped", reason: "order_not_found" };
  }
  if (ctx.paymentStatus !== "approved") {
    return { status: "skipped", reason: "payment_not_approved" };
  }
  if (!hasPhysicalBook(ctx.items)) {
    return { status: "skipped", reason: "no_physical_item" };
  }

  const ensured = await ensureOrderEmailNotification(orderId, "buyer_order_confirmed", emailStore);
  if ("skipped" in ensured) {
    return { status: "skipped", reason: ensured.reason };
  }

  const claimed = await claimOrderEmailForSend(ensured.notificationId, emailStore, nowMs);
  if (claimed.status === "already_sent") {
    return { status: "already_sent" };
  }
  if (claimed.status === "already_sending") {
    return { status: "already_sending" };
  }
  if (claimed.status === "skipped") {
    return { status: "skipped", reason: claimed.reason };
  }
  if (claimed.status === "provider_accepted") {
    const marked = await withRetries(markSentAttempts, () =>
      markOrderEmailSent(claimed.notificationId, emailStore, nowMs),
    );
    if (marked) {
      return { status: "sent" };
    }
    return { status: "accepted_unconfirmed" };
  }

  const appUrl = getAppUrl(env);
  if (!appUrl) {
    try {
      await markOrderEmailFailed(claimed.notificationId, emailStore);
    } catch {
      console.error("order_email_notification", { code: "EMAIL_MARK_FAILED_ERROR" });
    }
    try {
      await emailStore.insertOrderEvent(orderId, "buyer_order_confirmed_email_failed", {
        code: "APP_URL_INVALID",
      });
    } catch {
      console.error("order_email_notification", { code: "EVENT_INSERT_FAILED" });
    }
    return { status: "failed", code: "APP_URL_INVALID" };
  }

  const createAccess = deps.createTrackingAccess ?? createOrderTrackingAccess;
  const access = await createAccess(orderId, trackingStore);
  if (access.status !== "created") {
    try {
      await markOrderEmailFailed(claimed.notificationId, emailStore);
    } catch {
      console.error("order_email_notification", { code: "EMAIL_MARK_FAILED_ERROR" });
    }
    try {
      await emailStore.insertOrderEvent(orderId, "buyer_order_confirmed_email_failed", {
        code: access.reason,
      });
    } catch {
      console.error("order_email_notification", { code: "EVENT_INSERT_FAILED" });
    }
    return { status: "failed", code: access.reason };
  }

  const trackingPageUrl = buildOrderTrackingUrl(appUrl, access.rawToken);

  const sendEmail =
    deps.sendEmail ??
    ((context, url) => sendBuyerOrderConfirmedEmail(context, url, env));

  let sendResult: SendBuyerOrderConfirmedEmailResult;
  try {
    sendResult = await sendEmail(ctx, trackingPageUrl);
  } catch {
    sendResult = { ok: false, code: "EMAIL_SEND_FAILED" };
  }

  if (!sendResult.ok) {
    try {
      await markOrderEmailFailed(claimed.notificationId, emailStore);
    } catch {
      console.error("order_email_notification", { code: "EMAIL_MARK_FAILED_ERROR" });
    }
    try {
      await emailStore.insertOrderEvent(orderId, "buyer_order_confirmed_email_failed", {
        code: sendResult.code,
      });
    } catch {
      console.error("order_email_notification", { code: "EVENT_INSERT_FAILED" });
    }
    return { status: "failed", code: sendResult.code };
  }

  const accepted = await withRetries(markSentAttempts, () =>
    recordOrderEmailProviderAccepted(
      claimed.notificationId,
      sendResult.providerMessageId,
      emailStore,
      nowMs,
    ),
  );

  const markedSent = await withRetries(markSentAttempts, () =>
    markOrderEmailSent(claimed.notificationId, emailStore, nowMs),
  );

  if (markedSent) {
    try {
      await emailStore.insertOrderEvent(orderId, "buyer_order_confirmed_email_sent", {});
    } catch {
      console.error("order_email_notification", { code: "EVENT_INSERT_FAILED" });
    }
    return { status: "sent" };
  }

  if (accepted) {
    return { status: "accepted_unconfirmed" };
  }

  try {
    await markOrderEmailFailed(claimed.notificationId, emailStore);
  } catch {
    console.error("order_email_notification", { code: "EMAIL_MARK_FAILED_ERROR" });
  }
  return { status: "failed", code: "EMAIL_STATUS_UNCONFIRMED" };
}

/** Webhook-safe wrapper: never throws. */
export async function notifyBuyerOrderConfirmedSafe(
  orderId: string,
  emailStore: OrderEmailNotificationStore,
  trackingStore: OrderTrackingStore,
  deps: NotifyBuyerOrderConfirmedDeps = {},
): Promise<NotifyBuyerOrderConfirmedResult> {
  try {
    return await notifyBuyerOrderConfirmed(orderId, emailStore, trackingStore, deps);
  } catch {
    console.error("buyer_order_confirmed_notify_failed", { code: "NOTIFY_UNEXPECTED_ERROR" });
    return { status: "failed", code: "NOTIFY_UNEXPECTED_ERROR" };
  }
}
