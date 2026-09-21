import type { CreateOrderInput } from "@/lib/commerce/schemas";
import type { PurchaseSelection } from "@/lib/commerce/selection";
import { QuoteSelectionError, type OrderQuote } from "@/lib/commerce/quote";
import { centsToDecimalString } from "@/lib/payments/amount";
import { decidePaymentAttemptAction, type ExistingPaymentAttempt } from "@/lib/payments/idempotency";
import { MercadoPagoNotConfiguredError } from "@/lib/payments/config";
import { firstTransaction, splitPersonName, toPublicPaymentResult } from "@/lib/payments/public-result";
import type { CheckoutPayInput } from "@/lib/payments/schemas";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import type { MercadoPagoOrdersGateway, PublicPaymentResult } from "@/lib/payments/types";
import { mapProviderStatus, type PaymentStatus } from "@/lib/payments/status";

export type CheckoutPaymentErrorCode =
  | "VALIDATION_ERROR"
  | "SUPABASE_NOT_CONFIGURED"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_NOT_AVAILABLE"
  | "CATALOG_UNAVAILABLE"
  | "ORDER_PERSISTENCE_FAILED"
  | "PAYMENT_PROVIDER_UNAVAILABLE"
  | "PAYMENT_FAILED";

type CreateOrderResult =
  | { ok: true; publicId: string; orderId?: string }
  | { ok: false; code: CheckoutPaymentErrorCode; status: number };

export type StartCheckoutPaymentFailure = {
  ok: false;
  code: CheckoutPaymentErrorCode;
  status: number;
};

export type StartCheckoutPaymentSuccess = {
  ok: true;
  publicId: string;
  payment: PublicPaymentResult;
};

export type StartCheckoutPaymentResult = StartCheckoutPaymentSuccess | StartCheckoutPaymentFailure;

export type CheckoutPaymentStore = {
  findByIdempotencyKey: (key: string) => Promise<ExistingPaymentAttempt | null>;
  insertPayment: (input: {
    orderId: string;
    idempotencyKey: string;
    method: "pix" | "credit_card";
    amountCents: number;
    installments: number | null;
  }) => Promise<{ id: string }>;
  updatePayment: (input: {
    paymentId: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    status: PaymentStatus;
    statusDetail: string | null;
  }) => Promise<void>;
  insertEvent: (orderId: string, eventType: string, metadata: Record<string, unknown>) => Promise<void>;
};

export type CheckoutPaymentDependencies = {
  quote: (selection: PurchaseSelection) => Promise<OrderQuote>;
  createOrder: (input: CreateOrderInput) => Promise<CreateOrderResult>;
  store: CheckoutPaymentStore;
  mercadoPago: MercadoPagoOrdersGateway;
};

function selectionFromPayInput(input: CheckoutPayInput): PurchaseSelection {
  if (input.kind === "physical") {
    return { kind: "physical", quantity: input.quantity, ebookBump: input.ebookBump };
  }
  return { kind: "digital" };
}

function createOrderInputFromPay(input: CheckoutPayInput): CreateOrderInput {
  if (input.kind === "physical") {
    return {
      kind: "physical",
      quantity: input.quantity,
      ebookBump: input.ebookBump,
      customer: input.customer,
      shipping: input.shipping,
    };
  }
  return { kind: "digital", customer: input.customer };
}

function publicSuccess(publicId: string, payment: PublicPaymentResult): StartCheckoutPaymentSuccess {
  const result = { ok: true as const, publicId, payment };
  assertNoSensitiveFields(result);
  return result;
}

export async function startCheckoutPayment(
  input: CheckoutPayInput,
  deps: CheckoutPaymentDependencies,
): Promise<StartCheckoutPaymentResult> {
  try {
    const existing = await deps.store.findByIdempotencyKey(input.paymentAttemptId);
    const decision = decidePaymentAttemptAction(existing);

    if (decision.action === "reuse_result") {
      if (decision.attempt.providerOrderId) {
        try {
          const storedOrder = await deps.mercadoPago.getOrder(decision.attempt.providerOrderId);
          return publicSuccess(
            decision.attempt.publicId,
            toPublicPaymentResult(input.payment.method, storedOrder),
          );
        } catch {
          return publicSuccess(decision.attempt.publicId, {
            status: decision.attempt.status,
            statusDetail: null,
            method: input.payment.method,
            pix: null,
          });
        }
      }

      return publicSuccess(decision.attempt.publicId, {
        status: decision.attempt.status,
        statusDetail: null,
        method: input.payment.method,
        pix: null,
      });
    }

    const selection = selectionFromPayInput(input);
    const quote = await deps.quote(selection);

    if (!quote.purchasable) {
      return { ok: false, code: "PRODUCT_NOT_AVAILABLE", status: 409 };
    }

    let orderId: string;
    let publicId: string;
    let paymentId: string;

    if (decision.action === "retry_provider") {
      orderId = decision.attempt.orderId;
      publicId = decision.attempt.publicId;
      paymentId = decision.attempt.id;
    } else {
      const created = await deps.createOrder(createOrderInputFromPay(input));
      if (!created.ok) {
        return { ok: false, code: created.code, status: created.status };
      }
      if (!created.orderId) {
        return { ok: false, code: "ORDER_PERSISTENCE_FAILED", status: 503 };
      }
      orderId = created.orderId;
      publicId = created.publicId;

      try {
        const inserted = await deps.store.insertPayment({
          orderId,
          idempotencyKey: input.paymentAttemptId,
          method: input.payment.method,
          amountCents: quote.totalCents,
          installments: input.payment.method === "credit_card" ? input.payment.installments : null,
        });
        paymentId = inserted.id;
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        if (code === "23505") {
          const raced = await deps.store.findByIdempotencyKey(input.paymentAttemptId);
          if (!raced) {
            throw error;
          }
          const racedDecision = decidePaymentAttemptAction(raced);
          if (racedDecision.action === "reuse_result") {
            return publicSuccess(raced.publicId, {
              status: raced.status,
              statusDetail: null,
              method: input.payment.method,
              pix: null,
            });
          }
          orderId = raced.orderId;
          publicId = raced.publicId;
          paymentId = raced.id;
        } else {
          throw error;
        }
      }
    }

    const { firstName, lastName } = splitPersonName(input.customer.name);
    let mpOrder;
    try {
      mpOrder = await deps.mercadoPago.createOrder(
        {
          totalAmount: centsToDecimalString(quote.totalCents),
          externalReference: publicId,
          description: quote.items.map((item) => item.title).join(" + "),
          payer: {
            email: input.customer.email,
            firstName,
            lastName,
            identificationNumber: input.customer.document,
          },
          shipping: input.kind === "physical" ? input.shipping : null,
          payment: input.payment,
        },
        input.paymentAttemptId,
      );
    } catch (error) {
      if (error instanceof MercadoPagoNotConfiguredError) {
        throw error;
      }
      const providerStatus =
        typeof error === "object" && error && "status" in error ? Number(error.status) : null;
      if (providerStatus === 400) {
        return { ok: false, code: "VALIDATION_ERROR", status: 400 };
      }
      if (providerStatus === 402) {
        await deps.store.updatePayment({
          paymentId,
          providerOrderId: null,
          providerPaymentId: null,
          status: "rejected",
          statusDetail: null,
        });
        await deps.store.insertEvent(orderId, "payment_attempted", {
          provider: "mercado_pago",
          method: input.payment.method,
          payment_status: "rejected",
        });
        return publicSuccess(publicId, {
          status: "rejected",
          statusDetail: null,
          method: input.payment.method,
          pix: null,
        });
      }
      throw error;
    }

    const transaction = firstTransaction(mpOrder);
    const paymentStatus = mapProviderStatus(transaction?.status ?? mpOrder.status);
    const statusDetail = transaction?.status_detail ?? mpOrder.status_detail ?? null;

    await deps.store.updatePayment({
      paymentId,
      providerOrderId: mpOrder.id ?? null,
      providerPaymentId: transaction?.id ?? null,
      status: paymentStatus,
      statusDetail,
    });

    await deps.store.insertEvent(orderId, "payment_attempted", {
      provider: "mercado_pago",
      method: input.payment.method,
      payment_status: paymentStatus,
    });

    return publicSuccess(publicId, toPublicPaymentResult(input.payment.method, mpOrder));
  } catch (error) {
    if (error instanceof MercadoPagoNotConfiguredError) {
      return { ok: false, code: "PAYMENT_PROVIDER_UNAVAILABLE", status: 503 };
    }
    if (error instanceof QuoteSelectionError) {
      return {
        ok: false,
        code: error.code === "INVALID_QUANTITY" ? "VALIDATION_ERROR" : "CATALOG_UNAVAILABLE",
        status: error.code === "INVALID_QUANTITY" ? 400 : 503,
      };
    }
    return { ok: false, code: "PAYMENT_FAILED", status: 503 };
  }
}
