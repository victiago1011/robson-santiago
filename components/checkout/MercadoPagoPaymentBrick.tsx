"use client";

import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useEffect, useRef } from "react";
import { centsToBrickAmount } from "@/lib/payments/amount";
import { mapBrickFormToPayment } from "@/lib/payments/map-brick-form";
import type { CheckoutPaymentMethod } from "@/lib/payments/schemas";

type MercadoPagoPaymentBrickProps = {
  publicKey: string;
  amountCents: number;
  payerEmail?: string;
  payerDocument?: string;
  disabled?: boolean;
  onReady: () => void;
  onSubmitPayment: (payment: CheckoutPaymentMethod) => Promise<void>;
  onError: () => void;
};

export default function MercadoPagoPaymentBrick({
  publicKey,
  amountCents,
  payerEmail,
  payerDocument,
  disabled = false,
  onReady,
  onSubmitPayment,
  onError,
}: MercadoPagoPaymentBrickProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;
    initMercadoPago(publicKey, { locale: "pt-BR" });
  }, [publicKey]);

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      <Payment
        locale="pt"
        initialization={{
          amount: centsToBrickAmount(amountCents),
          payer: {
            email: payerEmail,
            identification: payerDocument
              ? {
                  type: "CPF",
                  number: payerDocument,
                }
              : undefined,
          },
        }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            bankTransfer: ["pix"],
            maxInstallments: 12,
          } as never,
          visual: {
            style: {
              theme: "default",
            },
          },
        }}
        onReady={onReady}
        onError={() => {
          onError();
        }}
        onSubmit={async (form) => {
          const payment = mapBrickFormToPayment(form);
          if (!payment) {
            throw new Error("UNSUPPORTED_PAYMENT_METHOD");
          }
          await onSubmitPayment(payment);
        }}
      />
    </div>
  );
}
