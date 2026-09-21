type SummaryItem = {
  type: "physical" | "digital";
  quantity: number;
  lineTotalCents: number;
};

type SummaryQuote = {
  ebookBump: boolean;
  discountCents: number;
  ebookBumpPriceCents: number | null;
  items: ReadonlyArray<SummaryItem>;
};

export type OrderSummaryPricing =
  | {
      mode: "combo_net";
      ebookNetCents: number;
      showSubtotal: false;
      showEbookDiscount: false;
    }
  | {
      mode: "standard";
      ebookNetCents: null;
      showSubtotal: true;
      showEbookDiscount: boolean;
    };

export function orderSummaryPricing(quote: SummaryQuote | null | undefined): OrderSummaryPricing {
  const digital = quote?.items.find((item) => item.type === "digital");
  const physical = quote?.items.find((item) => item.type === "physical");
  const bumpPrice = quote?.ebookBumpPriceCents;
  const netCloses =
    quote?.ebookBump === true &&
    physical !== undefined &&
    digital?.quantity === 1 &&
    typeof bumpPrice === "number" &&
    Number.isInteger(bumpPrice) &&
    bumpPrice > 0 &&
    digital.lineTotalCents - quote.discountCents === bumpPrice;

  if (quote && netCloses && typeof bumpPrice === "number") {
    return {
      mode: "combo_net",
      ebookNetCents: bumpPrice,
      showSubtotal: false,
      showEbookDiscount: false,
    };
  }

  return {
    mode: "standard",
    ebookNetCents: null,
    showSubtotal: true,
    showEbookDiscount: (quote?.discountCents ?? 0) > 0,
  };
}
