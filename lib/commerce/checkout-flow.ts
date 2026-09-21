import {
  firstInvalidCheckoutField,
  type CheckoutFieldErrors,
} from "@/lib/commerce/checkout-field-errors";
import type { CheckoutPaymentUiState } from "@/lib/payments/pix-status-polling";

export type CheckoutStep = "details" | "payment";

export function shouldMountPaymentSection(step: CheckoutStep): boolean {
  return step === "payment";
}

export function canAdvanceToPayment(input: {
  quoting: boolean;
  amountCents: number | null;
  errors: CheckoutFieldErrors;
}): boolean {
  return (
    !input.quoting &&
    typeof input.amountCents === "number" &&
    input.amountCents > 0 &&
    firstInvalidCheckoutField(input.errors) === null
  );
}

export function canAlterCheckoutOrder(input: {
  step: CheckoutStep;
  hasPayment: boolean;
  uiState: CheckoutPaymentUiState;
}): boolean {
  if (input.step !== "payment" || input.hasPayment) {
    return false;
  }
  return (
    input.uiState !== "processing" &&
    input.uiState !== "awaiting_pix" &&
    input.uiState !== "approved" &&
    input.uiState !== "refunded"
  );
}

export function isCheckoutOrderFrozen(uiState: CheckoutPaymentUiState): boolean {
  return uiState === "awaiting_pix" || uiState === "approved" || uiState === "refunded";
}

export function canEditCheckoutSelection(input: { step: CheckoutStep; frozen: boolean }): boolean {
  return input.step === "details" && !input.frozen;
}

export type DisplayedCheckoutOrder<TQuote> = {
  quote: TQuote | null;
  quantity: number;
  ebookBump: boolean;
};

export function displayedCheckoutOrder<TQuote>(
  live: DisplayedCheckoutOrder<TQuote>,
  frozen: DisplayedCheckoutOrder<TQuote> | null,
): DisplayedCheckoutOrder<TQuote> {
  return frozen ?? live;
}
