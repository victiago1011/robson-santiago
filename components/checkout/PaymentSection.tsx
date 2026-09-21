"use client";

import dynamic from "next/dynamic";
import PaymentApproved from "@/components/checkout/PaymentApproved";
import PixAwaiting from "@/components/checkout/PixAwaiting";
import { paymentBrickInstanceKey } from "@/lib/payments/payment-brick-ui";
import {
  checkoutShowsPixAwaiting,
  PIX_POLL_TIMEOUT_MESSAGE,
  PIX_REFUNDED_MESSAGE,
  type CheckoutPaymentUiState,
} from "@/lib/payments/pix-status-polling";
import type { CheckoutPaymentMethod } from "@/lib/payments/schemas";
import type { PublicPaymentResult } from "@/lib/payments/types";
import type { PurchaseKind } from "@/lib/commerce/selection";

const MercadoPagoPaymentBrick = dynamic(() => import("./MercadoPagoPaymentBrick"), {
  ssr: false,
  loading: () => (
    <p className="font-sans text-sm text-ink-soft">Carregando meios de pagamento...</p>
  ),
});

export type { CheckoutPaymentUiState };

type PaymentSectionProps = {
  kind: PurchaseKind;
  publicKey: string | null;
  amountCents: number | null;
  quoting: boolean;
  uiState: CheckoutPaymentUiState;
  payment: PublicPaymentResult | null;
  message: string | null;
  pixPollTimedOut?: boolean;
  onBrickReady: () => void;
  onSubmitPayment: (payment: CheckoutPaymentMethod) => Promise<void>;
  onBrickError: () => void;
};

export default function PaymentSection({
  kind,
  publicKey,
  amountCents,
  quoting,
  uiState,
  payment,
  message,
  pixPollTimedOut = false,
  onBrickReady,
  onSubmitPayment,
  onBrickError,
}: PaymentSectionProps) {
  const showBrick =
    publicKey &&
    amountCents &&
    amountCents > 0 &&
    !quoting &&
    (uiState === "loading" || uiState === "ready" || uiState === "processing" || uiState === "rejected" || uiState === "error");
  const showPix = checkoutShowsPixAwaiting(uiState) && Boolean(payment?.pix);
  const choosingPayment = !showPix && uiState !== "approved" && uiState !== "refunded";

  return (
    <section aria-labelledby="pagamento-heading" className="min-w-0">
      <h2 id="pagamento-heading" className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Pagamento
      </h2>
      {choosingPayment ? (
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
          Revise seu pedido e escolha como deseja pagar.
        </p>
      ) : null}

      <div className="mt-8">
        {!publicKey ? (
          <p className="font-sans text-sm text-ink">Não foi possível carregar os meios de pagamento.</p>
        ) : quoting || !amountCents ? (
          <p className="font-sans text-sm text-ink-soft">Carregando meios de pagamento...</p>
        ) : showPix && payment?.pix ? (
          <PixAwaiting
            qrCode={payment.pix.qrCode}
            qrCodeBase64={payment.pix.qrCodeBase64}
            timeoutNotice={pixPollTimedOut ? PIX_POLL_TIMEOUT_MESSAGE : null}
          />
        ) : uiState === "approved" ? (
          <PaymentApproved kind={kind} />
        ) : uiState === "refunded" ? (
          <p className="font-sans text-sm text-ink">{PIX_REFUNDED_MESSAGE}</p>
        ) : (
          <>
            {showBrick ? (
              <MercadoPagoPaymentBrick
                key={paymentBrickInstanceKey({ amountCents })}
                publicKey={publicKey}
                amountCents={amountCents}
                disabled={uiState === "processing"}
                onReady={onBrickReady}
                onSubmitPayment={onSubmitPayment}
                onError={onBrickError}
              />
            ) : null}
            {uiState === "processing" ? (
              <p className="mt-4 font-sans text-sm text-ink-soft">Processando pagamento...</p>
            ) : null}
            {uiState === "rejected" ? (
              <p className="mt-4 font-sans text-sm text-ink">
                Pagamento não aprovado. Seus dados foram preservados. Você pode tentar novamente.
              </p>
            ) : null}
            {uiState === "error" && message ? (
              <p className="mt-4 font-sans text-sm text-ink">{message}</p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
