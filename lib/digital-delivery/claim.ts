import type { DigitalDeliveryEnsureItemResult } from "@/lib/digital-delivery/ensure";
import {
  generateDigitalDeliveryToken,
  hashDigitalDeliveryToken,
} from "@/lib/digital-delivery/token";
import type { DigitalDeliveryEmailStore } from "@/lib/digital-delivery/types";

export { DIGITAL_DELIVERY_STALE_CLAIM_MS, isStaleSendingClaim } from "@/lib/digital-delivery/stale";

export type ClaimDigitalDeliveryForSendResult =
  | {
      status: "claimed";
      deliveryId: string;
      orderId: string;
      orderItemId: string;
      customerEmail: string;
      rawToken: string;
      reusedExistingToken: boolean;
    }
  | { status: "already_sent"; deliveryId: string; orderItemId: string }
  | { status: "already_sending"; deliveryId: string; orderItemId: string }
  | { status: "provider_accepted"; deliveryId: string; orderItemId: string }
  | { status: "skipped"; orderItemId?: string; reason: string };

function hasProviderAccepted(acceptedAt: string | null | undefined): boolean {
  return typeof acceptedAt === "string" && acceptedAt.trim().length > 0;
}

function hasDigitalFilePath(path: string | null | undefined): boolean {
  return typeof path === "string" && path.trim().length > 0;
}

function hasCustomerEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().length > 0;
}

export async function claimDigitalDeliveryForSend(
  input: { orderItemId: string; existingRawToken?: string },
  store: DigitalDeliveryEmailStore,
  nowMs: number = Date.now(),
): Promise<ClaimDigitalDeliveryForSendResult> {
  const context = await store.findSendContextByOrderItemId(input.orderItemId);
  if (!context) {
    return { status: "skipped", orderItemId: input.orderItemId, reason: "delivery_not_found" };
  }
  if (context.revokedAt) {
    return { status: "skipped", orderItemId: context.orderItemId, reason: "revoked" };
  }
  if (!hasDigitalFilePath(context.digitalFilePath)) {
    return {
      status: "skipped",
      orderItemId: context.orderItemId,
      reason: "missing_digital_file_path",
    };
  }
  if (!hasCustomerEmail(context.customerEmail)) {
    return { status: "skipped", orderItemId: context.orderItemId, reason: "missing_customer_email" };
  }
  if (context.emailStatus === "sent") {
    return {
      status: "already_sent",
      deliveryId: context.id,
      orderItemId: context.orderItemId,
    };
  }
  if (hasProviderAccepted(context.emailProviderAcceptedAt)) {
    return {
      status: "provider_accepted",
      deliveryId: context.id,
      orderItemId: context.orderItemId,
    };
  }

  const claimed = await store.claimEmailSend(context.id, nowMs);
  if (claimed.kind === "already_sent") {
    return {
      status: "already_sent",
      deliveryId: context.id,
      orderItemId: context.orderItemId,
    };
  }
  if (claimed.kind === "provider_accepted") {
    return {
      status: "provider_accepted",
      deliveryId: context.id,
      orderItemId: context.orderItemId,
    };
  }
  if (
    claimed.kind === "already_sending" ||
    claimed.kind === "lost_race" ||
    claimed.kind === "not_found" ||
    claimed.kind === "revoked"
  ) {
    if (claimed.kind === "not_found") {
      return { status: "skipped", orderItemId: context.orderItemId, reason: "delivery_not_found" };
    }
    if (claimed.kind === "revoked") {
      return { status: "skipped", orderItemId: context.orderItemId, reason: "revoked" };
    }
    return {
      status: "already_sending",
      deliveryId: context.id,
      orderItemId: context.orderItemId,
    };
  }

  const existingRawToken = input.existingRawToken;
  const canReuse =
    typeof existingRawToken === "string" &&
    existingRawToken.length > 0 &&
    hashDigitalDeliveryToken(existingRawToken) === claimed.tokenHash;

  if (canReuse && existingRawToken) {
    return {
      status: "claimed",
      deliveryId: context.id,
      orderId: context.orderId,
      orderItemId: context.orderItemId,
      customerEmail: context.customerEmail,
      rawToken: existingRawToken,
      reusedExistingToken: true,
    };
  }

  const rotated = generateDigitalDeliveryToken();
  const updated = await store.updateTokenHashIfSending(context.id, rotated.tokenHash);
  if (!updated) {
    await store.markEmailFailed(context.id);
    return {
      status: "skipped",
      orderItemId: context.orderItemId,
      reason: "token_rotate_rejected",
    };
  }

  return {
    status: "claimed",
    deliveryId: context.id,
    orderId: context.orderId,
    orderItemId: context.orderItemId,
    customerEmail: context.customerEmail,
    rawToken: rotated.rawToken,
    reusedExistingToken: false,
  };
}

export async function recordDigitalDeliveryProviderAccepted(
  deliveryId: string,
  providerMessageId: string | null,
  store: DigitalDeliveryEmailStore,
  acceptedAtMs: number = Date.now(),
): Promise<boolean> {
  return store.recordEmailProviderAccepted(deliveryId, providerMessageId, acceptedAtMs);
}

export async function markDigitalDeliveryEmailSent(
  deliveryId: string,
  store: DigitalDeliveryEmailStore,
  sentAtMs: number = Date.now(),
): Promise<boolean> {
  return store.markEmailSent(deliveryId, sentAtMs);
}

export async function markDigitalDeliveryEmailFailed(
  deliveryId: string,
  store: DigitalDeliveryEmailStore,
): Promise<boolean> {
  return store.markEmailFailed(deliveryId);
}

export async function prepareDigitalDeliverySendFromEnsureItem(
  item: DigitalDeliveryEnsureItemResult,
  store: DigitalDeliveryEmailStore,
  nowMs: number = Date.now(),
): Promise<ClaimDigitalDeliveryForSendResult> {
  if (item.status === "skipped") {
    return {
      status: "skipped",
      orderItemId: item.orderItemId,
      reason: item.reason,
    };
  }

  return claimDigitalDeliveryForSend(
    {
      orderItemId: item.orderItemId,
      existingRawToken: item.status === "created" ? item.rawToken : undefined,
    },
    store,
    nowMs,
  );
}
