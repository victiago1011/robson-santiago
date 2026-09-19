import type { CheckoutPaymentMethod } from "@/lib/payments/schemas";

type BrickLikePayload = {
  paymentType?: unknown;
  selectedPaymentMethod?: unknown;
  formData?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function mapBrickFormToPayment(payload: BrickLikePayload): CheckoutPaymentMethod | null {
  const formData = asRecord(payload.formData);
  const paymentType = String(payload.paymentType ?? payload.selectedPaymentMethod ?? "");
  const methodId = String(formData?.payment_method_id ?? "").toLowerCase();

  if (paymentType === "ticket" || methodId === "bolbradesco" || methodId === "pec") {
    return null;
  }

  if (paymentType === "bank_transfer" || methodId === "pix") {
    return { method: "pix" };
  }

  if (paymentType === "credit_card" || formData?.token) {
    const token = typeof formData?.token === "string" ? formData.token.trim() : "";
    const paymentMethodId =
      typeof formData?.payment_method_id === "string" ? formData.payment_method_id.trim() : "";
    const installments =
      typeof formData?.installments === "number" ? formData.installments : Number(formData?.installments);
    const issuerId = typeof formData?.issuer_id === "string" ? formData.issuer_id.trim() : undefined;

    if (!token || !paymentMethodId || !Number.isInteger(installments) || installments < 1) {
      return null;
    }

    return {
      method: "credit_card",
      token,
      paymentMethodId,
      installments,
      issuerId: issuerId || undefined,
    };
  }

  return null;
}
