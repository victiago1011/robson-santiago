"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import CustomerFields from "@/components/checkout/CustomerFields";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentSection from "@/components/checkout/PaymentSection";
import ShippingFields from "@/components/checkout/ShippingFields";
import {
  checkoutIsQuoting,
  checkoutNeedsRemoteQuote,
  checkoutPaymentAmountCents,
  checkoutQuoteSelection,
  readCheckoutQuoteResponse,
  selectCheckoutQuote,
  type CheckoutRemoteQuote,
} from "@/lib/commerce/checkout-quote-state";
import { PHYSICAL_BOOK } from "@/lib/commerce/product";
import type { PublicQuote } from "@/lib/commerce/quote";
import type { PurchaseKind } from "@/lib/commerce/selection";
import { newPaymentAttemptId } from "@/lib/payments/idempotency";
import {
  fetchCheckoutPaymentStatus,
  shouldStartPixStatusPolling,
  startPixStatusPolling,
  type CheckoutPaymentUiState,
} from "@/lib/payments/pix-status-polling";
import type { CheckoutPaymentMethod } from "@/lib/payments/schemas";
import type { PublicPaymentResult } from "@/lib/payments/types";

type CheckoutFormProps = {
  kind: PurchaseKind;
  initialQuote: PublicQuote | null;
  mercadoPagoPublicKey: string | null;
};

function userFacingPaymentMessage(code?: string): string {
  if (code === "PRODUCT_NOT_AVAILABLE") {
    return "Este produto ainda não está disponível para compra.";
  }
  if (code === "VALIDATION_ERROR") {
    return "Revise os dados preenchidos e tente novamente.";
  }
  return "Não foi possível processar o pagamento. Tente novamente.";
}

function readCheckoutFields(form: HTMLFormElement) {
  const data = new FormData(form);
  const read = (name: string) => String(data.get(name) ?? "").trim();
  return {
    customer: {
      name: read("customer_name"),
      email: read("customer_email"),
      phone: read("customer_phone"),
      document: read("customer_document"),
    },
    shipping: {
      zip: read("shipping_zip"),
      street: read("shipping_street"),
      number: read("shipping_number"),
      complement: read("shipping_complement") || undefined,
      district: read("shipping_district"),
      city: read("shipping_city"),
      state: read("shipping_state"),
    },
  };
}

export default function CheckoutForm({
  kind,
  initialQuote,
  mercadoPagoPublicKey,
}: CheckoutFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const paymentAttemptIdRef = useRef(newPaymentAttemptId());
  const processingRef = useRef(false);

  const [quantity, setQuantity] = useState<number>(
    kind === "physical" ? PHYSICAL_BOOK.minQuantity : 1,
  );
  const [ebookBump, setEbookBump] = useState(false);
  const [remote, setRemote] = useState<CheckoutRemoteQuote | null>(null);
  const [uiState, setUiState] = useState<CheckoutPaymentUiState>(
    mercadoPagoPublicKey ? "loading" : "error",
  );
  const [payment, setPayment] = useState<PublicPaymentResult | null>(null);
  const [orderPublicId, setOrderPublicId] = useState<string | null>(null);
  const [pixPollTimedOut, setPixPollTimedOut] = useState(false);
  const [message, setMessage] = useState<string | null>(
    mercadoPagoPublicKey ? null : "Não foi possível carregar os meios de pagamento.",
  );

  const handleQuantityChange = (nextQuantity: number) => {
    setQuantity(
      Math.min(PHYSICAL_BOOK.maxQuantity, Math.max(PHYSICAL_BOOK.minQuantity, nextQuantity)),
    );
  };

  const needsRemoteQuote = checkoutNeedsRemoteQuote({
    kind,
    quantity,
    ebookBump,
    initialQuote,
  });

  useEffect(() => {
    if (!needsRemoteQuote) {
      return;
    }

    const selection = checkoutQuoteSelection(kind, quantity, ebookBump);
    let cancelled = false;

    void fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (cancelled) return;
        const quote = readCheckoutQuoteResponse(data);
        if (!quote) {
          return;
        }
        setRemote({
          selection,
          quote,
        });
      })
      .catch(() => {
        // Keep the last successful quote; do not invent totals in the browser.
      });

    return () => {
      cancelled = true;
    };
  }, [needsRemoteQuote, kind, quantity, ebookBump]);

  const quote = selectCheckoutQuote({
    kind,
    quantity,
    ebookBump,
    initialQuote,
    remote,
  });
  const quoting = checkoutIsQuoting({
    kind,
    quantity,
    ebookBump,
    initialQuote,
    remote,
  });
  const amountCents = checkoutPaymentAmountCents(quote);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const requiresShipping = kind !== "digital";

  const submitPayment = useCallback(async (method: CheckoutPaymentMethod) => {
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;
    setUiState("processing");
    setMessage(null);

    const form = formRef.current;
    if (!form) {
      processingRef.current = false;
      setUiState("error");
      setMessage(userFacingPaymentMessage("VALIDATION_ERROR"));
      throw new Error("FORM_UNAVAILABLE");
    }

    const fields = readCheckoutFields(form);
    const payload =
      kind === "physical"
        ? {
            kind: "physical" as const,
            quantity,
            ebookBump,
            customer: fields.customer,
            shipping: fields.shipping,
            paymentAttemptId: paymentAttemptIdRef.current,
            payment: method,
          }
        : {
            kind: "digital" as const,
            customer: fields.customer,
            paymentAttemptId: paymentAttemptIdRef.current,
            payment: method,
          };

    try {
      const response = await fetch("/api/checkout/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: unknown = await response.json();

      if (
        typeof data === "object" &&
        data !== null &&
        "ok" in data &&
        data.ok === true &&
        "payment" in data
      ) {
        const result = data.payment as PublicPaymentResult;
        const nextPublicId =
          "publicId" in data && typeof data.publicId === "string" ? data.publicId : null;
        setPayment(result);
        setOrderPublicId(nextPublicId);
        setPixPollTimedOut(false);
        if (result.method === "pix" && result.pix && result.status !== "approved") {
          setUiState("awaiting_pix");
          return;
        }
        if (result.status === "approved") {
          setUiState("approved");
          return;
        }
        if (result.status === "rejected" || result.status === "cancelled") {
          paymentAttemptIdRef.current = newPaymentAttemptId();
          setUiState("rejected");
          return;
        }
        if (result.status === "refunded") {
          setUiState("refunded");
          return;
        }
        setUiState(result.status === "in_process" ? "processing" : "ready");
        return;
      }

      const code =
        typeof data === "object" && data !== null && "code" in data ? String(data.code) : undefined;
      paymentAttemptIdRef.current = newPaymentAttemptId();
      setUiState("error");
      setMessage(userFacingPaymentMessage(code));
    } catch {
      paymentAttemptIdRef.current = newPaymentAttemptId();
      setUiState("error");
      setMessage(userFacingPaymentMessage());
      throw new Error("PAYMENT_REQUEST_FAILED");
    } finally {
      processingRef.current = false;
    }
  }, [kind, quantity, ebookBump]);

  // Refresh during awaiting_pix drops in-memory QR/polling. Payment, webhook
  // and e-mail delivery are unaffected. Persistence is out of this change.
  useEffect(() => {
    if (
      !shouldStartPixStatusPolling({
        method: payment?.method,
        uiState,
        publicId: orderPublicId,
      }) ||
      !orderPublicId
    ) {
      return;
    }

    const stop = startPixStatusPolling(orderPublicId, {
      fetchStatus: fetchCheckoutPaymentStatus,
      onTerminal: (status) => {
        if (status === "approved") {
          setUiState("approved");
          return;
        }
        if (status === "refunded") {
          setUiState("refunded");
          return;
        }
        paymentAttemptIdRef.current = newPaymentAttemptId();
        setUiState("rejected");
      },
      onTimeout: () => {
        setPixPollTimedOut(true);
      },
    });

    return () => {
      stop();
    };
  }, [orderPublicId, payment?.method, uiState]);

  const handleBrickReady = useCallback(() => {
    if (!processingRef.current) {
      setUiState((current) => (current === "loading" ? "ready" : current));
    }
  }, []);

  const handleBrickError = useCallback(() => {
    setUiState("error");
    setMessage("Não foi possível carregar os meios de pagamento.");
  }, []);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="mt-12 grid items-start gap-12 md:grid-cols-12 md:gap-x-10 lg:gap-x-14"
    >
      <input type="hidden" name="kind" value={kind} />
      {kind === "physical" ? <input type="hidden" name="quantity" value={quantity} /> : null}
      {kind === "physical" ? <input type="hidden" name="ebook_bump" value={ebookBump ? "true" : "false"} /> : null}

      <div className="flex min-w-0 flex-col gap-12 md:col-span-7">
        <CustomerFields />
        {requiresShipping ? <ShippingFields /> : null}
        {kind === "digital" ? (
          <p className="font-sans text-sm leading-relaxed text-ink-soft">
            Entrega digital após confirmação do pagamento.
          </p>
        ) : null}
        <PaymentSection
          kind={kind}
          publicKey={mercadoPagoPublicKey}
          amountCents={amountCents}
          quoting={quoting}
          uiState={uiState}
          payment={payment}
          message={message}
          pixPollTimedOut={pixPollTimedOut}
          onBrickReady={handleBrickReady}
          onSubmitPayment={submitPayment}
          onBrickError={handleBrickError}
        />
      </div>

      <aside className="flex min-w-0 flex-col gap-8 md:sticky md:top-28 md:col-span-5">
        <OrderSummary
          quote={quote}
          quantity={quantity}
          quantityEditable={kind === "physical"}
          onQuantityChange={kind === "physical" ? handleQuantityChange : undefined}
          quoting={quoting}
          ebookBump={ebookBump}
          onEbookBumpChange={kind === "physical" ? setEbookBump : undefined}
        />
      </aside>
    </form>
  );
}
