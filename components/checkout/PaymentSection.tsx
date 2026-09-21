"use client";

import dynamic from "next/dynamic";
import PixAwaiting from "@/components/checkout/PixAwaiting";
import { paymentBrickInstanceKey } from "@/lib/payments/payment-brick-ui";
import type { CheckoutPaymentMethod } from "@/lib/payments/schemas";
import type { PublicPaymentResult } from "@/lib/payments/types";

const MercadoPagoPaymentBrick = dynamic(() => import("./MercadoPagoPaymentBrick"), {
  ssr: false,
  loading: () => (
    <p className="font-sans text-sm text-ink-soft">Carregando meios de pagamento...</p>
  ),
});

export type CheckoutPaymentUiState =
  | "loading"
  | "ready"
  | "processing"
  | "awaiting_pix"
  | "approved"
  | "rejected"
  | "error";

type PaymentSectionProps = {
  publicKey: string | null;
  amountCents: number | null;
  quoting: boolean;
  uiState: CheckoutPaymentUiState;
  payment: PublicPaymentResult | null;
  message: string | null;
  onBrickReady: () => void;
  onSubmitPayment: (payment: CheckoutPaymentMethod) => Promise<void>;
  onBrickError: () => void;
};

export default function PaymentSection({
  publicKey,
  amountCents,
  quoting,
  uiState,
  payment,
  message,
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

  return (
    <section aria-labelledby="pagamento-heading" className="min-w-0">
      <h2 id="pagamento-heading" className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Pagamento
      </h2>
      <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">
        Escolha Pix ou cartão de crédito para concluir a compra.
      </p>

      <div className="mt-8">
        {!publicKey ? (
          <p className="font-sans text-sm text-ink">Não foi possível carregar os meios de pagamento.</p>
        ) : quoting || !amountCents ? (
          <p className="font-sans text-sm text-ink-soft">Carregando meios de pagamento...</p>
        ) : uiState === "awaiting_pix" && payment?.pix ? (
          <PixAwaiting qrCode={payment.pix.qrCode} qrCodeBase64={payment.pix.qrCodeBase64} />
        ) : uiState === "approved" ? (
          <p className="font-sans text-sm text-ink">
            Pagamento aprovado. A confirmação definitiva chega após a notificação do Mercado Pago.
          </p>
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
