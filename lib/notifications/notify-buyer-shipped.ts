import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  claimOrderEmailForSend,
  ensureOrderEmailNotification,
  markOrderEmailFailed,
  markOrderEmailSent,
  recordOrderEmailProviderAccepted,
} from "@/lib/notifications/claim";
import {
  sendBuyerShippedEmail,
  type SendBuyerShippedEmailResult,
} from "@/lib/notifications/buyer-shipped-email";
import type { OrderEmailNotificationStore } from "@/lib/notifications/types";

export type NotifyBuyerShippedResult =
  | { status: "sent" }
  | { status: "already_sent" }
  | { status: "already_sending" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; code: string }
  | { status: "accepted_unconfirmed" };

export type NotifyBuyerShippedDeps = {
  env?: NodeJS.Dict<string>;
  nowMs?: number;
  sendEmail?: (ctx: Parameters<typeof sendBuyerShippedEmail>[0]) => Promise<SendBuyerShippedEmailResult>;
  markSentAttempts?: number;
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

export async function notifyBuyerShipped(
  orderId: string,
  store: OrderEmailNotificationStore,
  deps: NotifyBuyerShippedDeps = {},
): Promise<NotifyBuyerShippedResult> {
  const nowMs = deps.nowMs ?? Date.now();
  const markSentAttempts = deps.markSentAttempts ?? DEFAULT_MARK_SENT_ATTEMPTS;

  const ctx = await store.findBuyerShippedContext(orderId);
  if (!ctx) {
    return { status: "skipped", reason: "order_not_found" };
  }
  if (ctx.paymentStatus !== "approved") {
    return { status: "skipped", reason: "payment_not_approved" };
  }
  if (ctx.fulfillmentStatus !== "shipped") {
    return { status: "skipped", reason: "not_shipped" };
  }
  if (!hasPhysicalBook(ctx.items)) {
    return { status: "skipped", reason: "no_physical_item" };
  }
  if (!ctx.trackingCode?.trim()) {
    return { status: "skipped", reason: "missing_tracking_code" };
  }

  const ensured = await ensureOrderEmailNotification(orderId, "buyer_shipped", store);
  if ("skipped" in ensured) {
    return { status: "skipped", reason: ensured.reason };
  }

  const claimed = await claimOrderEmailForSend(ensured.notificationId, store, nowMs);
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
      markOrderEmailSent(claimed.notificationId, store, nowMs),
    );
    if (marked) {
      return { status: "sent" };
    }
    return { status: "accepted_unconfirmed" };
  }

  const sendEmail =
    deps.sendEmail ??
    ((context) => sendBuyerShippedEmail(context, deps.env ?? process.env));

  let sendResult: SendBuyerShippedEmailResult;
  try {
    sendResult = await sendEmail(ctx);
  } catch {
    sendResult = { ok: false, code: "EMAIL_SEND_FAILED" };
  }

  if (!sendResult.ok) {
    try {
      await markOrderEmailFailed(claimed.notificationId, store);
    } catch {
      console.error("order_email_notification", { code: "EMAIL_MARK_FAILED_ERROR" });
    }
    try {
      await store.insertOrderEvent(orderId, "buyer_shipped_email_failed", {
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
      store,
      nowMs,
    ),
  );

  const markedSent = await withRetries(markSentAttempts, () =>
    markOrderEmailSent(claimed.notificationId, store, nowMs),
  );

  if (markedSent) {
    try {
      await store.insertOrderEvent(orderId, "buyer_shipped_email_sent", {});
    } catch {
      console.error("order_email_notification", { code: "EVENT_INSERT_FAILED" });
    }
    return { status: "sent" };
  }

  if (accepted) {
    return { status: "accepted_unconfirmed" };
  }

  try {
    await markOrderEmailFailed(claimed.notificationId, store);
  } catch {
    console.error("order_email_notification", { code: "EMAIL_MARK_FAILED_ERROR" });
  }
  return { status: "failed", code: "EMAIL_STATUS_UNCONFIRMED" };
}
