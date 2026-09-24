import "server-only";

import { isStaleSendingClaim } from "@/lib/digital-delivery/stale";
import { ORDER_EMAIL_STALE_CLAIM_MS } from "@/lib/notifications/stale";
import { getSupabase } from "@/lib/supabase/server";
import type {
  AdminPhysicalSaleOrderContext,
  BuyerOrderConfirmedContext,
  BuyerShippedOrderContext,
  ClaimOrderEmailSendResult,
  OrderEmailNotificationKind,
  OrderEmailNotificationRow,
  OrderEmailNotificationStatus,
  OrderEmailNotificationStore,
} from "@/lib/notifications/types";

export { ORDER_EMAIL_STALE_CLAIM_MS } from "@/lib/notifications/stale";

type NotificationDbRow = {
  id: string;
  order_id: string;
  kind: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  provider_accepted_at: string | null;
};

const NOTIFICATION_COLUMNS =
  "id, order_id, kind, status, attempts, last_attempt_at, sent_at, provider_message_id, provider_accepted_at";

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function asStatus(value: string): OrderEmailNotificationStatus {
  if (value === "pending" || value === "sending" || value === "sent" || value === "failed") {
    return value;
  }
  throw new Error("INVALID_EMAIL_NOTIFICATION_STATUS");
}

function asKind(value: string): OrderEmailNotificationKind {
  if (
    value === "admin_physical_sale" ||
    value === "buyer_shipped" ||
    value === "buyer_order_confirmed"
  ) {
    return value;
  }
  throw new Error("INVALID_EMAIL_NOTIFICATION_KIND");
}

function mapRow(row: NotificationDbRow): OrderEmailNotificationRow {
  return {
    id: row.id,
    orderId: row.order_id,
    kind: asKind(row.kind),
    status: asStatus(row.status),
    attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at,
    sentAt: row.sent_at,
    providerMessageId: row.provider_message_id,
    providerAcceptedAt: row.provider_accepted_at,
  };
}

export const supabaseOrderEmailNotificationStore: OrderEmailNotificationStore = {
  async findNotification(orderId, kind) {
    const { data, error } = await getSupabase()
      .from("order_email_notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("order_id", orderId)
      .eq("kind", kind)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    return mapRow(data as NotificationDbRow);
  },

  async insertNotification(orderId, kind) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("order_email_notifications")
      .insert({ order_id: orderId, kind, status: "pending" })
      .select("id")
      .maybeSingle();

    if (!error && data) {
      return { kind: "inserted", id: (data as { id: string }).id };
    }

    if (isUniqueViolation(error)) {
      const existing = await this.findNotification(orderId, kind);
      if (existing) {
        return { kind: "conflict", id: existing.id };
      }
      return { kind: "error" };
    }

    if (error) {
      throw error;
    }
    return { kind: "error" };
  },

  async claimEmailSend(notificationId, nowMs): Promise<ClaimOrderEmailSendResult> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("order_email_notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("id", notificationId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return { kind: "not_found" };
    }

    const row = data as NotificationDbRow;
    const status = asStatus(row.status);
    if (status === "sent") {
      return { kind: "already_sent", notificationId };
    }
    if (row.provider_accepted_at) {
      return { kind: "provider_accepted", notificationId };
    }
    if (status === "sending" && !isStaleSendingClaim(row.last_attempt_at, nowMs, ORDER_EMAIL_STALE_CLAIM_MS)) {
      return { kind: "already_sending", notificationId };
    }
    if (status !== "pending" && status !== "failed" && status !== "sending") {
      return { kind: "lost_race" };
    }

    const nowIso = new Date(nowMs).toISOString();
    const staleBefore = new Date(nowMs - ORDER_EMAIL_STALE_CLAIM_MS).toISOString();
    let update = supabase
      .from("order_email_notifications")
      .update({
        status: "sending",
        attempts: row.attempts + 1,
        last_attempt_at: nowIso,
      })
      .eq("id", notificationId)
      .eq("status", status);

    if (status === "sending") {
      if (row.last_attempt_at) {
        update = update.lte("last_attempt_at", staleBefore);
      } else {
        update = update.is("last_attempt_at", null);
      }
    }

    const { data: updated, error: updateError } = await update
      .select("id, attempts")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }
    if (!updated) {
      return { kind: "lost_race" };
    }

    const claimed = updated as { id: string; attempts: number };
    return {
      kind: "claimed",
      notificationId: claimed.id,
      attempts: claimed.attempts,
    };
  },

  async recordProviderAccepted(notificationId, providerMessageId, acceptedAtMs) {
    const acceptedIso = new Date(acceptedAtMs).toISOString();
    const { data, error } = await getSupabase()
      .from("order_email_notifications")
      .update({
        provider_message_id: providerMessageId,
        provider_accepted_at: acceptedIso,
      })
      .eq("id", notificationId)
      .eq("status", "sending")
      .is("provider_accepted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (data) {
      return true;
    }

    const { data: current, error: readError } = await getSupabase()
      .from("order_email_notifications")
      .select("provider_accepted_at")
      .eq("id", notificationId)
      .maybeSingle();

    if (readError) {
      throw readError;
    }
    return Boolean(
      (current as { provider_accepted_at?: string | null } | null)?.provider_accepted_at,
    );
  },

  async markSent(notificationId, sentAtMs) {
    const { data, error } = await getSupabase()
      .from("order_email_notifications")
      .update({
        status: "sent",
        sent_at: new Date(sentAtMs).toISOString(),
      })
      .eq("id", notificationId)
      .eq("status", "sending")
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    return Boolean(data);
  },

  async markFailed(notificationId) {
    const { data, error } = await getSupabase()
      .from("order_email_notifications")
      .update({ status: "failed" })
      .eq("id", notificationId)
      .eq("status", "sending")
      .is("provider_accepted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }
    return Boolean(data);
  },

  async findAdminPhysicalSaleContext(orderId): Promise<AdminPhysicalSaleOrderContext | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        public_id,
        payment_status,
        customer_name,
        customer_email,
        total_cents,
        paid_at,
        shipping_zip,
        shipping_street,
        shipping_number,
        shipping_complement,
        shipping_district,
        shipping_city,
        shipping_state,
        order_items ( sku, quantity, title )
      `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as {
      id: string;
      public_id: string;
      payment_status: string;
      customer_name: string;
      customer_email: string;
      total_cents: number | null;
      paid_at: string | null;
      shipping_zip: string | null;
      shipping_street: string | null;
      shipping_number: string | null;
      shipping_complement: string | null;
      shipping_district: string | null;
      shipping_city: string | null;
      shipping_state: string | null;
      order_items: Array<{ sku: string; quantity: number; title: string }> | null;
    };

    return {
      orderId: row.id,
      publicId: row.public_id,
      paymentStatus: row.payment_status,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      totalCents: row.total_cents,
      paidAt: row.paid_at,
      shippingZip: row.shipping_zip,
      shippingStreet: row.shipping_street,
      shippingNumber: row.shipping_number,
      shippingComplement: row.shipping_complement,
      shippingDistrict: row.shipping_district,
      shippingCity: row.shipping_city,
      shippingState: row.shipping_state,
      items: row.order_items ?? [],
    };
  },

  async findBuyerShippedContext(orderId): Promise<BuyerShippedOrderContext | null> {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(
        `
        id,
        public_id,
        payment_status,
        fulfillment_status,
        customer_email,
        customer_name,
        tracking_code,
        shipped_at,
        order_items ( sku, quantity )
      `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as {
      id: string;
      public_id: string;
      payment_status: string;
      fulfillment_status: string;
      customer_email: string;
      customer_name: string;
      tracking_code: string | null;
      shipped_at: string | null;
      order_items: Array<{ sku: string; quantity: number }> | null;
    };

    return {
      orderId: row.id,
      publicId: row.public_id,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      trackingCode: row.tracking_code,
      shippedAt: row.shipped_at,
      items: row.order_items ?? [],
    };
  },

  async findBuyerOrderConfirmedContext(orderId): Promise<BuyerOrderConfirmedContext | null> {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(
        `
        id,
        public_id,
        payment_status,
        customer_name,
        customer_email,
        total_cents,
        order_items ( sku, quantity, title )
      `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as {
      id: string;
      public_id: string;
      payment_status: string;
      customer_name: string;
      customer_email: string;
      total_cents: number | null;
      order_items: Array<{ sku: string; quantity: number; title: string }> | null;
    };

    return {
      orderId: row.id,
      publicId: row.public_id,
      paymentStatus: row.payment_status,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      totalCents: row.total_cents,
      items: row.order_items ?? [],
    };
  },

  async insertOrderEvent(orderId, eventType, metadata) {
    const { error } = await getSupabase().from("order_events").insert({
      order_id: orderId,
      event_type: eventType,
      metadata,
    });
    if (error) {
      throw error;
    }
  },
};
