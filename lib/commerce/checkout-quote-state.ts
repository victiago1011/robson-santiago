import type { PublicQuote } from "@/lib/commerce/quote";
import {
  PHYSICAL_QUANTITY,
  type PurchaseKind,
  type PurchaseSelection,
} from "@/lib/commerce/selection";

export type CheckoutRemoteQuote = {
  selection: PurchaseSelection;
  quote: PublicQuote;
};

export function checkoutQuoteSelection(
  kind: PurchaseKind,
  quantity: number,
  ebookBump: boolean,
): PurchaseSelection {
  if (kind === "digital") {
    return { kind: "digital" };
  }
  return { kind: "physical", quantity, ebookBump };
}

export function isDefaultPhysicalSelection(
  kind: PurchaseKind,
  quantity: number,
  ebookBump: boolean,
): boolean {
  return kind === "physical" && quantity === PHYSICAL_QUANTITY.min && ebookBump === false;
}

export function checkoutNeedsRemoteQuote(input: {
  kind: PurchaseKind;
  quantity: number;
  ebookBump: boolean;
  initialQuote: PublicQuote | null;
}): boolean {
  if (input.initialQuote === null) {
    return true;
  }
  return input.kind === "physical" && !isDefaultPhysicalSelection(input.kind, input.quantity, input.ebookBump);
}

export function remoteQuoteMatchesSelection(
  remote: CheckoutRemoteQuote | null,
  kind: PurchaseKind,
  quantity: number,
  ebookBump: boolean,
): remote is CheckoutRemoteQuote {
  if (!remote) {
    return false;
  }
  if (kind === "digital") {
    return remote.selection.kind === "digital";
  }
  return (
    remote.selection.kind === "physical" &&
    remote.selection.quantity === quantity &&
    remote.selection.ebookBump === ebookBump
  );
}

export function selectCheckoutQuote(input: {
  kind: PurchaseKind;
  quantity: number;
  ebookBump: boolean;
  initialQuote: PublicQuote | null;
  remote: CheckoutRemoteQuote | null;
}): PublicQuote | null {
  if (remoteQuoteMatchesSelection(input.remote, input.kind, input.quantity, input.ebookBump)) {
    return input.remote.quote;
  }
  return input.initialQuote;
}

export function checkoutIsQuoting(input: {
  kind: PurchaseKind;
  quantity: number;
  ebookBump: boolean;
  initialQuote: PublicQuote | null;
  remote: CheckoutRemoteQuote | null;
}): boolean {
  return (
    checkoutNeedsRemoteQuote(input) &&
    !remoteQuoteMatchesSelection(input.remote, input.kind, input.quantity, input.ebookBump)
  );
}

export function checkoutPaymentAmountCents(quote: PublicQuote | null): number | null {
  const total = quote?.totalCents;
  if (typeof total !== "number" || !Number.isInteger(total) || total <= 0) {
    return null;
  }
  return total;
}

export function readCheckoutQuoteResponse(data: unknown): PublicQuote | null {
  if (
    typeof data !== "object" ||
    data === null ||
    !("ok" in data) ||
    data.ok !== true ||
    !("quote" in data) ||
    typeof data.quote !== "object" ||
    data.quote === null
  ) {
    return null;
  }

  const quote = data.quote as PublicQuote;
  if (checkoutPaymentAmountCents(quote) === null) {
    return null;
  }
  return quote;
}
