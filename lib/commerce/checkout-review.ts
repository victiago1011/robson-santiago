import type { PurchaseKind } from "@/lib/commerce/selection";

export type CheckoutReviewData = {
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  shipping: {
    zip: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  } | null;
};

export function checkoutReviewFromFields(
  kind: PurchaseKind,
  fields: {
    customer: CheckoutReviewData["customer"];
    shipping: NonNullable<CheckoutReviewData["shipping"]>;
  },
): CheckoutReviewData {
  return {
    customer: { ...fields.customer },
    shipping: kind === "physical" ? { ...fields.shipping } : null,
  };
}
