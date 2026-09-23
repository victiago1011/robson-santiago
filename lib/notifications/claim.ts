import type {
  ClaimOrderEmailSendResult,
  OrderEmailNotificationKind,
  OrderEmailNotificationStore,
} from "@/lib/notifications/types";

export type ClaimOrderEmailForSendResult =
  | { status: "claimed"; notificationId: string; attempts: number }
  | { status: "already_sent"; notificationId: string }
  | { status: "already_sending"; notificationId: string }
  | { status: "provider_accepted"; notificationId: string }
  | { status: "skipped"; reason: string };

export async function ensureOrderEmailNotification(
  orderId: string,
  kind: OrderEmailNotificationKind,
  store: OrderEmailNotificationStore,
): Promise<{ notificationId: string } | { skipped: true; reason: string }> {
  const existing = await store.findNotification(orderId, kind);
  if (existing) {
    return { notificationId: existing.id };
  }

  const inserted = await store.insertNotification(orderId, kind);
  if (inserted.kind === "inserted" || inserted.kind === "conflict") {
    return { notificationId: inserted.id };
  }
  return { skipped: true, reason: "insert_failed" };
}

export async function claimOrderEmailForSend(
  notificationId: string,
  store: OrderEmailNotificationStore,
  nowMs: number = Date.now(),
): Promise<ClaimOrderEmailForSendResult> {
  const claimed: ClaimOrderEmailSendResult = await store.claimEmailSend(notificationId, nowMs);

  if (claimed.kind === "claimed") {
    return {
      status: "claimed",
      notificationId: claimed.notificationId,
      attempts: claimed.attempts,
    };
  }
  if (claimed.kind === "already_sent") {
    return { status: "already_sent", notificationId: claimed.notificationId };
  }
  if (claimed.kind === "already_sending") {
    return { status: "already_sending", notificationId: claimed.notificationId };
  }
  if (claimed.kind === "provider_accepted") {
    return { status: "provider_accepted", notificationId: claimed.notificationId };
  }
  if (claimed.kind === "not_found") {
    return { status: "skipped", reason: "notification_not_found" };
  }
  return { status: "skipped", reason: "lost_race" };
}

export async function recordOrderEmailProviderAccepted(
  notificationId: string,
  providerMessageId: string | null,
  store: OrderEmailNotificationStore,
  acceptedAtMs: number = Date.now(),
): Promise<boolean> {
  return store.recordProviderAccepted(notificationId, providerMessageId, acceptedAtMs);
}

export async function markOrderEmailSent(
  notificationId: string,
  store: OrderEmailNotificationStore,
  sentAtMs: number = Date.now(),
): Promise<boolean> {
  return store.markSent(notificationId, sentAtMs);
}

export async function markOrderEmailFailed(
  notificationId: string,
  store: OrderEmailNotificationStore,
): Promise<boolean> {
  return store.markFailed(notificationId);
}
