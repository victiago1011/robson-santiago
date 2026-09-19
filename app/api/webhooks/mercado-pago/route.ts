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
  });

  return NextResponse.json(
    { ok: result.ok, ...(result.code ? { code: result.code } : {}) },
    { status: result.status },
  );
}
