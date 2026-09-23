import { PHYSICAL_SKU } from "@/lib/commerce/selection";
import {
  claimOrderEmailForSend,
  ensureOrderEmailNotification,
  markOrderEmailFailed,
  markOrderEmailSent,
  recordOrderEmailProviderAccepted,
} from "@/lib/notifications/claim";
import {
  sendAdminPhysicalSaleEmail,
  type SendAdminPhysicalSaleEmailResult,
} from "@/lib/notifications/admin-physical-sale-email";
import type { OrderEmailNotificationStore } from "@/lib/notifications/types";

export type NotifyAdminPhysicalSaleResult =
  | { status: "sent" }
  | { status: "already_sent" }
  | { status: "already_sending" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; code: string }
  | { status: "accepted_unconfirmed" };

export type NotifyAdminPhysicalSaleDeps = {
  env?: NodeJS.Dict<string>;
  nowMs?: number;
  sendEmail?: (ctx: Parameters<typeof sendAdminPhysicalSaleEmail>[0]) => Promise<SendAdminPhysicalSaleEmailResult>;
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

/**
 * Best-effort admin notification after payment approval.
 * Never throws to the caller for Resend/store send failures that are handled
 * as failed/skipped outcomes. Store infrastructure errors may still throw;
 * webhook wiring must catch them so payment reconciliation is never undone.
 */
export async function notifyAdminPhysicalSale(
  orderId: string,
  store: OrderEmailNotificationStore,
  deps: NotifyAdminPhysicalSaleDeps = {},
): Promise<NotifyAdminPhysicalSaleResult> {
  const nowMs = deps.nowMs ?? Date.now();
  const markSentAttempts = deps.markSentAttempts ?? DEFAULT_MARK_SENT_ATTEMPTS;

  const ctx = await store.findAdminPhysicalSaleContext(orderId);
  if (!ctx) {
    return { status: "skipped", reason: "order_not_found" };
  }
  if (ctx.paymentStatus !== "approved") {
    return { status: "skipped", reason: "payment_not_approved" };
  }
  if (!hasPhysicalBook(ctx.items)) {
    return { status: "skipped", reason: "no_physical_item" };
  }

  const ensured = await ensureOrderEmailNotification(orderId, "admin_physical_sale", store);
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
    ((context) => sendAdminPhysicalSaleEmail(context, deps.env ?? process.env));

  let sendResult: SendAdminPhysicalSaleEmailResult;
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
      await store.insertOrderEvent(orderId, "admin_physical_sale_email_failed", {
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
      await store.insertOrderEvent(orderId, "admin_physical_sale_email_sent", {});
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

/** Webhook-safe wrapper: never throws. */
export async function notifyAdminPhysicalSaleSafe(
  orderId: string,
  store: OrderEmailNotificationStore,
  deps: NotifyAdminPhysicalSaleDeps = {},
): Promise<NotifyAdminPhysicalSaleResult> {
  try {
    return await notifyAdminPhysicalSale(orderId, store, deps);
  } catch {
    console.error("admin_physical_sale_notify_failed", { code: "NOTIFY_UNEXPECTED_ERROR" });
    return { status: "failed", code: "NOTIFY_UNEXPECTED_ERROR" };
  }
}
