import { centsToBrickAmount } from "@/lib/payments/amount";

/**
 * Static Brick settings. Module-level so the Payment SDK sees a stable
 * `customization` reference across React renders.
 */
export const PAYMENT_BRICK_CUSTOMIZATION = {
  paymentMethods: {
    creditCard: "all" as const,
    bankTransfer: ["pix"] as const,
    maxInstallments: 12,
  },
  visual: {
    style: {
      theme: "default" as const,
    },
  },
};

export type PaymentBrickInitialization = {
  amount: number;
};

/**
 * Brick initialization. Amount only — never email/CPF/name, which would
 * remount @mercadopago/sdk-react Payment on every keystroke.
 */
export function createPaymentBrickInitialization(amountCents: number): PaymentBrickInitialization {
  return { amount: centsToBrickAmount(amountCents) };
}

/**
 * Value that may remount the Brick (via React `key` or initialization.amount).
 * Buyer fields are accepted only to assert they do not affect identity.
 */
export function paymentBrickInstanceKey(state: {
  amountCents: number;
  payerEmail?: string;
  payerDocument?: string;
}): number {
  void state.payerEmail;
  void state.payerDocument;
  return state.amountCents;
}

export const CHECKOUT_TEST_COPY_PATTERNS = [
  /ambiente de teste/i,
  /nenhuma cobran[cç]a real/i,
] as const;
