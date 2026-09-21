"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import CheckoutReview from "@/components/checkout/CheckoutReview";
import CustomerFields from "@/components/checkout/CustomerFields";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentSection from "@/components/checkout/PaymentSection";
import ShippingFields from "@/components/checkout/ShippingFields";
import {
  canAdvanceToPayment,
  canAlterCheckoutOrder,
  canEditCheckoutSelection,
  decideCheckoutValidationFailure,
  displayedCheckoutOrder,
  isCheckoutOrderFrozen,
  shouldMountPaymentSection,
  type CheckoutStep,
} from "@/lib/commerce/checkout-flow";
import {
  checkoutFieldErrors,
  firstInvalidCheckoutField,
  type CheckoutFieldErrors,
  type CheckoutFieldId,
} from "@/lib/commerce/checkout-field-errors";
import { checkoutReviewFromFields, type CheckoutReviewData } from "@/lib/commerce/checkout-review";
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
  BrickSubmitRejected,
  brickSubmitOutcomeFromPayment,
  decideBrickSubmitResolution,
} from "@/lib/payments/brick-submit";
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

type FrozenCheckoutOrder = {
  quote: PublicQuote | null;
  quantity: number;
  ebookBump: boolean;
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

  const [step, setStep] = useState<CheckoutStep>("details");
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null);
  const [review, setReview] = useState<CheckoutReviewData | null>(null);
  const [quantity, setQuantity] = useState<number>(
    kind === "physical" ? PHYSICAL_BOOK.minQuantity : 1,
  );
  const [ebookBump, setEbookBump] = useState(false);
  const [frozenOrder, setFrozenOrder] = useState<FrozenCheckoutOrder | null>(null);
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

  const clearFieldError = (id: CheckoutFieldId) => {
    setFieldErrors((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
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
  const quoteRef = useRef(quote);
  quoteRef.current = quote;
  const quoting = checkoutIsQuoting({
    kind,
    quantity,
    ebookBump,
    initialQuote,
    remote,
  });
  const displayed = displayedCheckoutOrder({ quote, quantity, ebookBump }, frozenOrder);
  const amountCents = checkoutPaymentAmountCents(displayed.quote);
  const orderFrozen = frozenOrder !== null || isCheckoutOrderFrozen(uiState);
  const selectionEditable =
    kind === "physical" && canEditCheckoutSelection({ step, frozen: orderFrozen });
  const showAlterOrder = canAlterCheckoutOrder({
    step,
    hasPayment: payment !== null,
    uiState,
  });

  function handleBackToDetails() {
    if (payment !== null || uiState === "processing" || isCheckoutOrderFrozen(uiState)) {
      return;
    }
    setStep("details");
  }

  function handleContinue() {
    const form = formRef.current;
    if (!form || step !== "details") {
      return;
    }

    const fields = readCheckoutFields(form);
    const errors = checkoutFieldErrors({
      kind,
      ebookBump,
      customer: fields.customer,
      shipping: fields.shipping,
    });
    setDetailsNotice(null);
    setFieldErrors(errors);

    if (!canAdvanceToPayment({ quoting, amountCents, errors })) {
      const first = firstInvalidCheckoutField(errors);
      if (first) {
        requestAnimationFrame(() => {
          const field = document.getElementById(first);
          field?.focus();
          field?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      return;
    }

    setReview(checkoutReviewFromFields(kind, fields));
    if (payment === null) {
      setUiState(mercadoPagoPublicKey ? "loading" : "error");
      setMessage(
        mercadoPagoPublicKey ? null : "Não foi possível carregar os meios de pagamento.",
      );
    }
    setStep("payment");
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "details") {
      handleContinue();
    }
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
        const snapshot = {
          quote: quoteRef.current,
          quantity,
          ebookBump,
        };
        setFrozenOrder((current) => current ?? snapshot);
        setPayment(result);
        setOrderPublicId(nextPublicId);
        setPixPollTimedOut(false);

        const outcome = brickSubmitOutcomeFromPayment({
          ok: true,
          method: result.method,
          status: result.status,
          hasPix: Boolean(result.pix),
        });
        if (outcome.type === "awaiting_pix") {
          setUiState("awaiting_pix");
        } else if (outcome.type === "approved") {
          setUiState("approved");
        } else if (outcome.type === "rejected" || outcome.type === "cancelled") {
          paymentAttemptIdRef.current = newPaymentAttemptId();
          setUiState("rejected");
        } else if (outcome.type === "refunded") {
          setUiState("refunded");
        } else {
          setUiState(result.status === "in_process" ? "processing" : "ready");
        }

        if (decideBrickSubmitResolution(outcome) === "reject") {
          throw new BrickSubmitRejected();
        }
        return;
      }

      const code =
        typeof data === "object" && data !== null && "code" in data ? String(data.code) : undefined;
      if (code === "VALIDATION_ERROR") {
        const currentFields = readCheckoutFields(form);
        const errors = checkoutFieldErrors({
          kind,
          ebookBump,
          customer: currentFields.customer,
          shipping: currentFields.shipping,
        });
        const failure = decideCheckoutValidationFailure(errors);
        paymentAttemptIdRef.current = newPaymentAttemptId();
        setFieldErrors(errors);
        setDetailsNotice(failure.notice);
        setMessage(null);
        setUiState("ready");
        setStep(failure.step);
        const first = firstInvalidCheckoutField(errors);
        if (first) {
          requestAnimationFrame(() => {
            const field = document.getElementById(first);
            field?.focus();
            field?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        }
        throw new BrickSubmitRejected();
      }
      paymentAttemptIdRef.current = newPaymentAttemptId();
      setUiState("error");
      setMessage(userFacingPaymentMessage(code));
      if (
        decideBrickSubmitResolution(brickSubmitOutcomeFromPayment({ ok: false, code })) === "reject"
      ) {
        throw new BrickSubmitRejected();
      }
    } catch (error) {
      if (error instanceof BrickSubmitRejected) {
        throw error;
      }
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
        <div hidden={step === "payment"}>
          <div className="flex flex-col gap-12">
            {detailsNotice ? (
              <p role="alert" className="font-sans text-sm leading-relaxed text-[#8f2d2d]">
                {detailsNotice}
              </p>
            ) : null}
            <CustomerFields errors={fieldErrors} onClearField={clearFieldError} />
            {requiresShipping ? (
              <ShippingFields errors={fieldErrors} onClearField={clearFieldError} />
            ) : null}
            {kind === "digital" ? (
              <p className="font-sans text-sm leading-relaxed text-ink-soft">
                Entrega digital após confirmação do pagamento.
              </p>
            ) : null}
          </div>
        </div>

        {shouldMountPaymentSection(step) ? (
          <div className="flex flex-col gap-10">
            {showAlterOrder ? (
              <button
                type="button"
                onClick={handleBackToDetails}
                className="inline-flex min-h-11 items-center self-start font-sans text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:underline"
              >
                ← Alterar dados ou pedido
              </button>
            ) : null}
            {review ? <CheckoutReview review={review} /> : null}
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
        ) : (
          <div>
            <button
              type="button"
              onClick={handleContinue}
              disabled={quoting || amountCents === null}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-5 font-sans text-sm font-medium tracking-[0.12em] text-paper-strong uppercase hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar para pagamento
            </button>
            {quoting ? (
              <p className="mt-3 font-sans text-sm text-ink-soft">Atualizando o valor do pedido...</p>
            ) : null}
          </div>
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-8 md:sticky md:top-28 md:col-span-5">
        <OrderSummary
          quote={displayed.quote}
          quantity={displayed.quantity}
          quantityEditable={selectionEditable}
          onQuantityChange={selectionEditable ? handleQuantityChange : undefined}
          quoting={quoting && frozenOrder === null}
          ebookBump={displayed.ebookBump}
          onEbookBumpChange={selectionEditable ? setEbookBump : undefined}
        />
      </aside>
    </form>
  );
}
