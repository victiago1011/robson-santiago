import {
  markDigitalDeliveryEmailFailed,
  markDigitalDeliveryEmailSent,
  prepareDigitalDeliverySendFromEnsureItem,
  recordDigitalDeliveryProviderAccepted,
} from "@/lib/digital-delivery/claim";
import { ensureDigitalDeliveries } from "@/lib/digital-delivery/ensure";
import {
  sendEbookDeliveryEmail,
  type SendEbookDeliveryEmailResult,
} from "@/lib/digital-delivery/ebook-email";
import type {
  DigitalDeliveryEmailStore,
  DigitalDeliveryStore,
} from "@/lib/digital-delivery/types";

export type DigitalDeliveryFulfillStore = DigitalDeliveryStore & DigitalDeliveryEmailStore;

export type FulfillDigitalDeliveryItemOutcome =
  | { status: "sent"; orderItemId: string }
  | { status: "already_sent"; orderItemId: string }
  | { status: "already_sending"; orderItemId: string }
  | { status: "skipped"; orderItemId?: string; reason: string }
  | { status: "failed"; orderItemId: string; code: string }
  | { status: "accepted_unconfirmed"; orderItemId: string }
  | { status: "sent_unconfirmed"; orderItemId: string };

export type FulfillApprovedOrderDigitalDeliveriesResult = {
  orderId: string;
  items: FulfillDigitalDeliveryItemOutcome[];
  needsRetry: boolean;
};

export type FulfillApprovedOrderDigitalDeliveriesDeps = {
  env?: NodeJS.Dict<string>;
  nowMs?: number;
  sendEmail?: (input: {
    customerEmail: string;
    rawToken: string;
  }) => Promise<SendEbookDeliveryEmailResult>;
  markSentAttempts?: number;
};

const DEFAULT_MARK_SENT_ATTEMPTS = 3;

function publicError(code: string, extra?: Record<string, unknown>): void {
  console.error("digital_delivery_fulfill", { code, ...extra });
}

async function withRetries(attempts: number, fn: () => Promise<boolean>): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (await fn()) {
        return true;
      }
    } catch {
      publicError("EMAIL_STATUS_RETRY");
    }
  }
  return false;
}

async function markSentConservatively(
  deliveryId: string,
  store: DigitalDeliveryEmailStore,
  sentAtMs: number,
  attempts: number,
): Promise<boolean> {
  return withRetries(attempts, () => markDigitalDeliveryEmailSent(deliveryId, store, sentAtMs));
}

async function recordAcceptedConservatively(
  deliveryId: string,
  providerMessageId: string | null,
  store: DigitalDeliveryEmailStore,
  acceptedAtMs: number,
  attempts: number,
): Promise<boolean> {
  return withRetries(attempts, () =>
    recordDigitalDeliveryProviderAccepted(deliveryId, providerMessageId, store, acceptedAtMs),
  );
}

async function markFailedAfterSendError(
  deliveryId: string,
  store: DigitalDeliveryEmailStore,
): Promise<boolean> {
  try {
    return await markDigitalDeliveryEmailFailed(deliveryId, store);
  } catch {
    publicError("EMAIL_MARK_FAILED_ERROR");
    return false;
  }
}

async function finalizeSentAfterProviderAccepted(
  deliveryId: string,
  orderItemId: string,
  store: DigitalDeliveryEmailStore,
  sentAtMs: number,
  attempts: number,
): Promise<FulfillDigitalDeliveryItemOutcome> {
  const markedSent = await markSentConservatively(deliveryId, store, sentAtMs, attempts);
  if (markedSent) {
    return { status: "sent", orderItemId };
  }
  publicError("EMAIL_PROVIDER_ACCEPTED_UNSENT", { orderItemId });
  return { status: "accepted_unconfirmed", orderItemId };
}

export async function fulfillApprovedOrderDigitalDeliveries(
  orderId: string,
  store: DigitalDeliveryFulfillStore,
  deps: FulfillApprovedOrderDigitalDeliveriesDeps = {},
): Promise<FulfillApprovedOrderDigitalDeliveriesResult> {
  const nowMs = deps.nowMs ?? Date.now();
  const markSentAttempts = deps.markSentAttempts ?? DEFAULT_MARK_SENT_ATTEMPTS;
  const sendEmail =
    deps.sendEmail ??
    ((input) => sendEbookDeliveryEmail(input, deps.env ?? process.env));

  const ensured = await ensureDigitalDeliveries(orderId, store);
  const items: FulfillDigitalDeliveryItemOutcome[] = [];

  for (const ensuredItem of ensured.items) {
    if (ensuredItem.status === "skipped") {
      items.push({
        status: "skipped",
        orderItemId: ensuredItem.orderItemId,
        reason: ensuredItem.reason,
      });
      continue;
    }

    const claimed = await prepareDigitalDeliverySendFromEnsureItem(ensuredItem, store, nowMs);

    if (claimed.status === "skipped") {
      items.push({
        status: "skipped",
        orderItemId: claimed.orderItemId,
        reason: claimed.reason,
      });
      continue;
    }
    if (claimed.status === "already_sent") {
      items.push({
        status: "already_sent",
        orderItemId: claimed.orderItemId,
      });
      continue;
    }
    if (claimed.status === "provider_accepted") {
      items.push(
        await finalizeSentAfterProviderAccepted(
          claimed.deliveryId,
          claimed.orderItemId,
          store,
          nowMs,
          markSentAttempts,
        ),
      );
      continue;
    }
    if (claimed.status === "already_sending") {
      items.push({
        status: "already_sending",
        orderItemId: claimed.orderItemId,
      });
      continue;
    }

    const sentAtMs = deps.nowMs ?? Date.now();
    let sendResult: SendEbookDeliveryEmailResult;
    try {
      sendResult = await sendEmail({
        customerEmail: claimed.customerEmail,
        rawToken: claimed.rawToken,
      });
    } catch {
      sendResult = { ok: false, code: "EMAIL_SEND_FAILED" };
    }

    if (!sendResult.ok) {
      await markFailedAfterSendError(claimed.deliveryId, store);
      publicError("EMAIL_SEND_FAILED", { orderItemId: claimed.orderItemId });
      items.push({
        status: "failed",
        orderItemId: claimed.orderItemId,
        code: sendResult.code,
      });
      continue;
    }

    const accepted = await recordAcceptedConservatively(
      claimed.deliveryId,
      sendResult.providerMessageId,
      store,
      sentAtMs,
      markSentAttempts,
    );
    if (accepted) {
      items.push(
        await finalizeSentAfterProviderAccepted(
          claimed.deliveryId,
          claimed.orderItemId,
          store,
          sentAtMs,
          markSentAttempts,
        ),
      );
      continue;
    }

    const markedSent = await markSentConservatively(
      claimed.deliveryId,
      store,
      sentAtMs,
      markSentAttempts,
    );
    if (markedSent) {
      items.push({ status: "sent", orderItemId: claimed.orderItemId });
      continue;
    }

    publicError("EMAIL_SENT_UNCONFIRMED", { orderItemId: claimed.orderItemId });
    items.push({ status: "sent_unconfirmed", orderItemId: claimed.orderItemId });
  }

  const needsRetry = items.some(
    (item) => item.status === "failed" || item.status === "accepted_unconfirmed",
  );
  return { orderId, items, needsRetry };
}
