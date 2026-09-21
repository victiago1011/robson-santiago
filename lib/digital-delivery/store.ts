import "server-only";

import { getSupabase } from "@/lib/supabase/server";
import type { OrderPaymentStatus } from "@/lib/payments/status";
import { DIGITAL_DELIVERY_STALE_CLAIM_MS, isStaleSendingClaim } from "@/lib/digital-delivery/stale";
import type {
  ClaimEmailSendResult,
  DigitalDeliveryDownloadContext,
  DigitalDeliveryDownloadStore,
  DigitalDeliveryEmailStatus,
  DigitalDeliveryEmailStore,
  DigitalDeliverySendContext,
  DigitalDeliveryStore,
  InsertDigitalDeliveryInput,
  InsertDigitalDeliveryResult,
} from "@/lib/digital-delivery/types";

type OrderRow = {
  id: string;
  payment_status: string;
  fulfillment_status: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
};

type ProductRow = {
  id: string;
  type: string;
  digital_file_path: string | null;
};

type DeliveryClaimRow = {
  id: string;
  order_id: string;
  order_item_id: string;
  product_id: string;
  token_hash: string;
  email_status: string;
  email_attempts: number;
  email_sent_at: string | null;
  last_email_attempt_at: string | null;
  email_provider_message_id: string | null;
  email_provider_accepted_at: string | null;
  revoked_at: string | null;
};

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function asEmailStatus(value: string): DigitalDeliveryEmailStatus {
  if (value === "pending" || value === "sending" || value === "sent" || value === "failed") {
    return value;
  }
  throw new Error("INVALID_EMAIL_STATUS");
}

const SEND_CONTEXT_COLUMNS =
  "id, order_id, order_item_id, product_id, token_hash, email_status, email_attempts, email_sent_at, last_email_attempt_at, email_provider_message_id, email_provider_accepted_at, revoked_at";

const DOWNLOAD_CONTEXT_COLUMNS =
  "id, order_id, order_item_id, product_id, email_status, download_count, created_at, revoked_at, first_downloaded_at, last_downloaded_at";

export const supabaseDigitalDeliveryStore: DigitalDeliveryStore &
  DigitalDeliveryEmailStore &
  DigitalDeliveryDownloadStore = {
  async findOrderById(orderId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_status, fulfillment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as OrderRow;
    return {
      id: row.id,
      paymentStatus: row.payment_status as OrderPaymentStatus,
      fulfillmentStatus: row.fulfillment_status,
    };
  },

  async listOrderItems(orderId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, sku")
      .eq("order_id", orderId);

    if (error) {
      throw error;
    }

    return ((data as OrderItemRow[] | null) ?? []).map((row) => ({
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      sku: row.sku,
    }));
  },

  async findProductById(productId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("id, type, digital_file_path")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as ProductRow;
    return {
      id: row.id,
      type: row.type,
      digitalFilePath: row.digital_file_path,
    };
  },

  async insertDelivery(input: InsertDigitalDeliveryInput): Promise<InsertDigitalDeliveryResult> {
    const supabase = getSupabase();
    const { error } = await supabase.from("digital_deliveries").insert({
      order_id: input.orderId,
      order_item_id: input.orderItemId,
      product_id: input.productId,
      token_hash: input.tokenHash,
    });

    if (!error) {
      return { kind: "inserted" };
    }
    if (isUniqueViolation(error)) {
      return { kind: "conflict" };
    }
    throw error;
  },

  async findSendContextByOrderItemId(orderItemId): Promise<DigitalDeliverySendContext | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .select(SEND_CONTEXT_COLUMNS)
      .eq("order_item_id", orderItemId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as DeliveryClaimRow;
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("customer_email")
      .eq("id", row.order_id)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("digital_file_path")
      .eq("id", row.product_id)
      .maybeSingle();

    if (productError) {
      throw productError;
    }

    return {
      id: row.id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      customerEmail: ((order as { customer_email?: string } | null)?.customer_email ?? "").trim(),
      tokenHash: row.token_hash,
      emailStatus: asEmailStatus(row.email_status),
      emailAttempts: row.email_attempts,
      emailSentAt: row.email_sent_at,
      emailProviderMessageId: row.email_provider_message_id,
      emailProviderAcceptedAt: row.email_provider_accepted_at,
      digitalFilePath: (product as { digital_file_path?: string | null } | null)?.digital_file_path ?? null,
      revokedAt: row.revoked_at,
    };
  },

  async claimEmailSend(deliveryId, nowMs): Promise<ClaimEmailSendResult> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .select(SEND_CONTEXT_COLUMNS)
      .eq("id", deliveryId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return { kind: "not_found" };
    }

    const row = data as DeliveryClaimRow;
    if (row.revoked_at) {
      return { kind: "revoked" };
    }

    const status = asEmailStatus(row.email_status);
    if (status === "sent") {
      return { kind: "already_sent" };
    }
    if (row.email_provider_accepted_at) {
      return { kind: "provider_accepted" };
    }
    if (status === "sending" && !isStaleSendingClaim(row.last_email_attempt_at, nowMs)) {
      return { kind: "already_sending" };
    }
    if (status !== "pending" && status !== "failed" && status !== "sending") {
      return { kind: "lost_race" };
    }

    const nowIso = new Date(nowMs).toISOString();
    const staleBefore = new Date(nowMs - DIGITAL_DELIVERY_STALE_CLAIM_MS).toISOString();
    let update = supabase
      .from("digital_deliveries")
      .update({
        email_status: "sending",
        email_attempts: row.email_attempts + 1,
        last_email_attempt_at: nowIso,
      })
      .eq("id", deliveryId)
      .eq("email_status", status);

    if (status === "sending") {
      if (row.last_email_attempt_at) {
        update = update.lte("last_email_attempt_at", staleBefore);
      } else {
        update = update.is("last_email_attempt_at", null);
      }
    }

    const { data: updated, error: updateError } = await update
      .select("id, token_hash, email_attempts")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }
    if (!updated) {
      return { kind: "lost_race" };
    }

    const claimed = updated as { token_hash: string; email_attempts: number };
    return {
      kind: "claimed",
      tokenHash: claimed.token_hash,
      emailAttempts: claimed.email_attempts,
    };
  },

  async updateTokenHashIfSending(deliveryId, tokenHash): Promise<boolean> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .update({ token_hash: tokenHash })
      .eq("id", deliveryId)
      .eq("email_status", "sending")
      .is("email_provider_accepted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    return Boolean(data);
  },

  async recordEmailProviderAccepted(deliveryId, providerMessageId, acceptedAtMs): Promise<boolean> {
    const supabase = getSupabase();
    const acceptedIso = new Date(acceptedAtMs).toISOString();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .update({
        email_provider_message_id: providerMessageId,
        email_provider_accepted_at: acceptedIso,
      })
      .eq("id", deliveryId)
      .eq("email_status", "sending")
      .is("email_provider_accepted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (data) {
      return true;
    }

    const { data: current, error: readError } = await supabase
      .from("digital_deliveries")
      .select("email_provider_accepted_at")
      .eq("id", deliveryId)
      .maybeSingle();

    if (readError) {
      throw readError;
    }
    return Boolean((current as { email_provider_accepted_at?: string | null } | null)?.email_provider_accepted_at);
  },

  async markEmailSent(deliveryId, sentAtMs): Promise<boolean> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .update({
        email_status: "sent",
        email_sent_at: new Date(sentAtMs).toISOString(),
      })
      .eq("id", deliveryId)
      .eq("email_status", "sending")
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    return Boolean(data);
  },

  async markEmailFailed(deliveryId): Promise<boolean> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .update({ email_status: "failed" })
      .eq("id", deliveryId)
      .eq("email_status", "sending")
      .is("email_provider_accepted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    return Boolean(data);
  },

  async findDownloadContextByTokenHash(tokenHash): Promise<DigitalDeliveryDownloadContext | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .select(DOWNLOAD_CONTEXT_COLUMNS)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as {
      id: string;
      order_id: string;
      order_item_id: string;
      product_id: string;
      email_status: string;
      download_count: number;
      created_at: string;
      revoked_at: string | null;
      first_downloaded_at: string | null;
      last_downloaded_at: string | null;
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("payment_status")
      .eq("id", row.order_id)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }
    if (!order) {
      return null;
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("digital_file_path")
      .eq("id", row.product_id)
      .maybeSingle();

    if (productError) {
      throw productError;
    }

    return {
      id: row.id,
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      emailStatus: asEmailStatus(row.email_status),
      digitalFilePath:
        (product as { digital_file_path?: string | null } | null)?.digital_file_path ?? null,
      revokedAt: row.revoked_at,
      downloadCount: row.download_count,
      createdAt: row.created_at,
      paymentStatus: (order as { payment_status: string }).payment_status as OrderPaymentStatus,
      firstDownloadedAt: row.first_downloaded_at,
      lastDownloadedAt: row.last_downloaded_at,
    };
  },

  async recordDownload(deliveryId, nowMs): Promise<void> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_deliveries")
      .select("download_count, first_downloaded_at")
      .eq("id", deliveryId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return;
    }

    const current = data as {
      download_count: number;
      first_downloaded_at: string | null;
    };
    const nowIso = new Date(nowMs).toISOString();
    const { error: updateError } = await supabase
      .from("digital_deliveries")
      .update({
        download_count: current.download_count + 1,
        first_downloaded_at: current.first_downloaded_at ?? nowIso,
        last_downloaded_at: nowIso,
      })
      .eq("id", deliveryId);

    if (updateError) {
      throw updateError;
    }
  },
};
