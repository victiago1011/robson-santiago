import { NextResponse } from "next/server";
import { handleMercadoPagoWebhook } from "@/lib/payments/handle-webhook";
import { createMercadoPagoOrdersGateway } from "@/lib/payments/mercado-pago-orders";
import {
  findOrderByPublicId,
  insertOrderEvent,
  listPaymentsForOrder,
  updateOrderPaymentStatus,
  updatePaymentProviderResult,
} from "@/lib/payments/store";
import { fulfillApprovedOrderDigitalDeliveries } from "@/lib/digital-delivery/fulfill-approved-order";
import { supabaseDigitalDeliveryStore } from "@/lib/digital-delivery/store";
import { notifyAdminPhysicalSaleSafe } from "@/lib/notifications/notify-admin-physical-sale";
import { supabaseOrderEmailNotificationStore } from "@/lib/notifications/store";

export async function POST(request: Request) {
  const result = await handleMercadoPagoWebhook(request, process.env, {
    getMercadoPago: () => createMercadoPagoOrdersGateway(),
    store: {
      findOrderByPublicId,
      listPaymentsForOrder,
      updatePayment: updatePaymentProviderResult,
      updateOrderPaymentStatus,
      insertEvent: insertOrderEvent,
    },
    ensureDigitalDeliveries: async (orderId) => {
      const result = await fulfillApprovedOrderDigitalDeliveries(
        orderId,
        supabaseDigitalDeliveryStore,
      );
      if (result.needsRetry) {
        throw new Error("DIGITAL_DELIVERY_RETRY");
      }
    },
    notifyAdminPhysicalSale: async (orderId) => {
      await notifyAdminPhysicalSaleSafe(orderId, supabaseOrderEmailNotificationStore);
    },
  });

  return NextResponse.json(
    { ok: result.ok, ...(result.code ? { code: result.code } : {}) },
    { status: result.status },
  );
}
