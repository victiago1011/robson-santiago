export const PHYSICAL_SKU = "AVIDA-FISICO";
export const DIGITAL_SKU = "AVIDA-EBOOK";
export const EBOOK_BUMP_PROMOTION_CODE = "AVIDA-EBOOK-BUMP";

export const PHYSICAL_QUANTITY = {
  min: 1,
  max: 5,
} as const;

export const CHECKOUT_OPTION_QUERY = {
  fisico: "physical",
  ebook: "digital",
} as const;

export type CheckoutOptionParam = keyof typeof CHECKOUT_OPTION_QUERY;
export type PurchaseKind = (typeof CHECKOUT_OPTION_QUERY)[CheckoutOptionParam];

export type PurchaseSelection =
  | { kind: "physical"; quantity: number; ebookBump: boolean }
  | { kind: "digital" };

export function isCheckoutOptionParam(value: string): value is CheckoutOptionParam {
  return value in CHECKOUT_OPTION_QUERY;
}

export function checkoutOptionToKind(option: CheckoutOptionParam): PurchaseKind {
  return CHECKOUT_OPTION_QUERY[option];
}

export function parseCheckoutOptionParam(
  value: string | string[] | undefined,
): CheckoutOptionParam | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return "fisico";
  }
  if (!isCheckoutOptionParam(raw)) {
    return null;
  }
  return raw;
}

export function selectionFromKind(
  kind: PurchaseKind,
  quantity = PHYSICAL_QUANTITY.min,
  ebookBump = false,
): PurchaseSelection {
  if (kind === "physical") {
    return { kind: "physical", quantity, ebookBump };
  }
  return { kind: "digital" };
}
