import { NextResponse } from "next/server";
import { calculateOrderQuote } from "@/lib/commerce/calculate-order-quote";
import { createOrder } from "@/lib/commerce/create-order";
import { checkoutPaySchema } from "@/lib/payments/schemas";
import { createMercadoPagoOrdersGateway } from "@/lib/payments/mercado-pago-orders";
import { startCheckoutPayment } from "@/lib/payments/start-checkout-payment";
import {
  findPaymentByIdempotencyKey,
  insertOrderEvent,
  insertPaymentAttempt,
  updatePaymentProviderResult,
} from "@/lib/payments/store";
import { MercadoPagoNotConfiguredError } from "@/lib/payments/config";
import { QuoteSelectionError } from "@/lib/commerce/quote";
import { SupabaseNotConfiguredError } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const parsed = checkoutPaySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const result = await startCheckoutPayment(parsed.data, {
      quote: calculateOrderQuote,
      createOrder,
      store: {
        findByIdempotencyKey: findPaymentByIdempotencyKey,
        insertPayment: insertPaymentAttempt,
        updatePayment: updatePaymentProviderResult,
        insertEvent: insertOrderEvent,
      },
      mercadoPago: createMercadoPagoOrdersGateway(),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, code: result.code }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MercadoPagoNotConfiguredError) {
      return NextResponse.json({ ok: false, code: "PAYMENT_PROVIDER_UNAVAILABLE" }, { status: 503 });
    }
    if (error instanceof QuoteSelectionError) {
      return NextResponse.json(
        { ok: false, code: error.code === "INVALID_QUANTITY" ? "VALIDATION_ERROR" : "CATALOG_UNAVAILABLE" },
        { status: error.code === "INVALID_QUANTITY" ? 400 : 503 },
      );
    }
    if (error instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, code: "PAYMENT_FAILED" }, { status: 503 });
  }
}
