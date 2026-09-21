"use client";

import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  createPaymentBrickInitialization,
  PAYMENT_BRICK_CUSTOMIZATION,
} from "@/lib/payments/payment-brick-ui";
import { mapBrickFormToPayment } from "@/lib/payments/map-brick-form";
import type { CheckoutPaymentMethod } from "@/lib/payments/schemas";

type MercadoPagoPaymentBrickProps = {
  publicKey: string;
  amountCents: number;
  disabled?: boolean;
  onReady: () => void;
  onSubmitPayment: (payment: CheckoutPaymentMethod) => Promise<void>;
  onError: () => void;
};

export default function MercadoPagoPaymentBrick({
  publicKey,
  amountCents,
  disabled = false,
  onReady,
  onSubmitPayment,
  onError,
}: MercadoPagoPaymentBrickProps) {
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onSubmitPaymentRef = useRef(onSubmitPayment);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;
  onSubmitPaymentRef.current = onSubmitPayment;

  const initialization = useMemo(
    () => createPaymentBrickInitialization(amountCents),
    [amountCents],
  );

  const handleReady = useCallback(() => {
    onReadyRef.current();
  }, []);

  const handleError = useCallback(() => {
    onErrorRef.current();
  }, []);

  const handleSubmit = useCallback(async (form: unknown) => {
    const payment = mapBrickFormToPayment(form as Parameters<typeof mapBrickFormToPayment>[0]);
    if (!payment) {
      throw new Error("UNSUPPORTED_PAYMENT_METHOD");
    }
    await onSubmitPaymentRef.current(payment);
  }, []);

  useEffect(() => {
    initMercadoPago(publicKey, { locale: "pt-BR" });
  }, [publicKey]);

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      <Payment
        locale="pt"
        initialization={initialization}
        customization={PAYMENT_BRICK_CUSTOMIZATION as never}
        onReady={handleReady}
        onError={handleError}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
