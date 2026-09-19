import "server-only";

import { getSupabase } from "@/lib/supabase/server";
import type { ExistingPaymentAttempt } from "@/lib/payments/idempotency";
import type { OrderPaymentStatus, PaymentStatus } from "@/lib/payments/status";

type PaymentRow = {
  id: string;
  order_id: string;
  provider_payment_id: string | null;
  provider_order_id: string | null;
  status: PaymentStatus;
  status_detail: string | null;
  method: "pix" | "credit_card" | null;
  installments: number | null;
  amount_cents: number | null;
  idempotency_key: string;
};

type OrderPublicRow = {
  public_id: string;
};

export type InsertPaymentInput = {
  orderId: string;
  idempotencyKey: string;
  method: "pix" | "credit_card";
  amountCents: number;
  installments: number | null;
};

export type UpdatePaymentProviderInput = {
  paymentId: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: PaymentStatus;
  statusDetail: string | null;
};

export async function findPaymentByIdempotencyKey(
  idempotencyKey: string,
): Promise<ExistingPaymentAttempt | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, order_id, provider_payment_id, provider_order_id, status, status_detail, method, installments, amount_cents, idempotency_key",
    )
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const row = data as PaymentRow;
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("public_id")
    .eq("id", row.order_id)
    .maybeSingle();

  if (orderError || !order) {
    throw orderError ?? new Error("ORDER_NOT_FOUND");
  }

  return {
    id: row.id,
    orderId: row.order_id,
    publicId: (order as OrderPublicRow).public_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
  };
}

export async function insertPaymentAttempt(input: InsertPaymentInput): Promise<{ id: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      order_id: input.orderId,
      provider: "mercado_pago",
      method: input.method,
      status: "pending",
      amount_cents: input.amountCents,
      installments: input.installments,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("PAYMENT_INSERT_FAILED");
  }

  return { id: (data as { id: string }).id };
}

export async function updatePaymentProviderResult(input: UpdatePaymentProviderInput): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("payments")
    .update({
      provider_order_id: input.providerOrderId,
      provider_payment_id: input.providerPaymentId,
      status: input.status,
      status_detail: input.statusDetail,
    })
    .eq("id", input.paymentId);

  if (error) {
    throw error;
  }
}

export async function insertOrderEvent(
  orderId: string,
  eventType: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: eventType,
    metadata,
  });

  if (error) {
    throw error;
  }
}

type OrderLookupRow = {
  id: string;
  public_id: string;
  total_cents: number | null;
  currency: string;
  payment_status: string;
  fulfillment_status: string;
};

export async function findOrderByPublicId(publicId: string): Promise<{
  id: string;
  publicId: string;
  totalCents: number | null;
  currency: string;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: string;
} | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("id, public_id, total_cents, currency, payment_status, fulfillment_status")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const row = data as OrderLookupRow;
  return {
    id: row.id,
    publicId: row.public_id,
    totalCents: row.total_cents,
    currency: row.currency,
    paymentStatus: row.payment_status as OrderPaymentStatus,
    fulfillmentStatus: row.fulfillment_status,
  };
}

type PaymentLookupRow = {
  id: string;
  order_id: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  status: PaymentStatus;
};

export async function listPaymentsForOrder(orderId: string): Promise<
  {
    id: string;
    orderId: string;
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    status: PaymentStatus;
  }[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("payments")
    .select("id, order_id, provider, provider_order_id, provider_payment_id, status")
    .eq("order_id", orderId);

  if (error) {
    throw error;
  }

  return ((data as PaymentLookupRow[] | null) ?? []).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    status: row.status,
  }));
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: OrderPaymentStatus,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}
