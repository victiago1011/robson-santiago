"use client";

import EbookBumpOffer from "@/components/checkout/EbookBumpOffer";
import { formatBRLFromCents } from "@/lib/commerce/money";
import { orderSummaryPricing } from "@/lib/commerce/order-summary-pricing";
import { DIGITAL_BOOK, PHYSICAL_BOOK } from "@/lib/commerce/product";
import type { PublicQuote } from "@/lib/commerce/quote";

type OrderSummaryProps = {
  quote: PublicQuote | null;
  quantity: number;
  quantityEditable: boolean;
  onQuantityChange?: (quantity: number) => void;
  quoting?: boolean;
  ebookBump?: boolean;
  onEbookBumpChange?: (checked: boolean) => void;
};

function shippingLabel(physicalQuantity: number | undefined): string {
  if (physicalQuantity === 1) {
    return "Frete (1 livro)";
  }
  if (physicalQuantity && physicalQuantity > 1) {
    return `Frete (${physicalQuantity} livros)`;
  }

  return "Frete";
}

export default function OrderSummary({
  quote,
  quantity,
  quantityEditable,
  onQuantityChange,
  quoting = false,
  ebookBump = false,
  onEbookBumpChange,
}: OrderSummaryProps) {
  const decreaseDisabled = quantity <= PHYSICAL_BOOK.minQuantity;
  const increaseDisabled = quantity >= PHYSICAL_BOOK.maxQuantity;
  const pricing = orderSummaryPricing(quote);
  const physicalItem = quote?.items.find((item) => item.type === "physical");
  const digitalItem = quote?.items.find((item) => item.type === "digital");
  const showPhysical = Boolean(physicalItem) || quantityEditable;
  const showBump = quantityEditable && onEbookBumpChange;
  const showDigitalAsBump = ebookBump && showPhysical;
  const showDigitalAsProduct = Boolean(digitalItem && !physicalItem);

  return (
    <section
      aria-labelledby="pedido-heading"
      className="rounded-xl border border-rule bg-paper-strong px-5 py-7 md:px-7 md:py-8"
    >
      <h2 id="pedido-heading" className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Seu pedido
      </h2>

      <div className="mt-6">
        {quote || showPhysical ? (
          <ul className="space-y-5">
            {showPhysical ? (
              <li>
                <p id="physical-qty-label" className="font-sans text-base text-ink">
                  {physicalItem?.title ?? PHYSICAL_BOOK.title} — {PHYSICAL_BOOK.format}
                </p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  {quantityEditable && onQuantityChange ? (
                    <div className="inline-flex items-center rounded-lg border border-rule">
                      <button
                        type="button"
                        onClick={() => onQuantityChange(quantity - 1)}
                        disabled={decreaseDisabled}
                        aria-label="Diminuir quantidade de livros físicos"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center font-sans text-lg text-ink disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        −
                      </button>
                      <span
                        aria-live="polite"
                        aria-labelledby="physical-qty-label"
                        className="min-w-8 text-center font-sans text-base tabular-nums text-ink"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuantityChange(quantity + 1)}
                        disabled={increaseDisabled}
                        aria-label="Aumentar quantidade de livros físicos"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center font-sans text-lg text-ink disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <p className="font-sans text-sm text-ink-soft">
                      {quantity} {quantity === 1 ? "unidade" : "unidades"}
                    </p>
                  )}
                  <p className="shrink-0 font-display text-base italic text-ink">
                    {physicalItem ? formatBRLFromCents(physicalItem.lineTotalCents) : "—"}
                  </p>
                </div>
              </li>
            ) : null}

            {showDigitalAsProduct && digitalItem ? (
              <li className="flex items-baseline justify-between gap-4">
                <p className="font-sans text-base text-ink">{digitalItem.title}</p>
                <p className="shrink-0 font-display text-base italic text-ink">
                  {formatBRLFromCents(digitalItem.lineTotalCents)}
                </p>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="font-display text-base text-ink-soft italic">Resumo indisponível no momento.</p>
        )}
      </div>

      {showBump ? (
        <div className="mt-2 border-t border-rule">
          <EbookBumpOffer
            checked={ebookBump}
            onChange={onEbookBumpChange}
            listPriceCents={quote?.ebookListPriceCents ?? null}
            bumpPriceCents={quote?.ebookBumpPriceCents ?? null}
          />
        </div>
      ) : null}

      {showDigitalAsBump ? (
        <div className="flex items-baseline justify-between gap-4 border-t border-rule py-6">
          <div className="min-w-0">
            <p className="font-sans text-base text-ink">{digitalItem?.title ?? DIGITAL_BOOK.title}</p>
            <p className="mt-1 font-sans text-sm text-ink-soft">
              {pricing.mode === "combo_net" ? "Oferta com o livro" : "Order bump · 1 unidade"}
            </p>
          </div>
          <p className="shrink-0 font-display text-base italic text-ink">
            {pricing.mode === "combo_net"
              ? formatBRLFromCents(pricing.ebookNetCents)
              : digitalItem
                ? formatBRLFromCents(digitalItem.lineTotalCents)
                : "—"}
          </p>
        </div>
      ) : null}

      <dl
        className={`space-y-3 border-t border-rule pt-6 font-sans text-sm text-ink ${quoting ? "opacity-70" : ""}`}
      >
        {pricing.showSubtotal ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-display text-base italic text-ink">
              {quote ? formatBRLFromCents(quote.subtotalCents) : "—"}
            </dd>
          </div>
        ) : null}
        {pricing.showEbookDiscount && quote ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Desconto e-book</dt>
            <dd className="font-display text-base italic text-ink">
              − {formatBRLFromCents(quote.discountCents)}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-soft">
            {quote && quote.shippingCents > 0
              ? shippingLabel(physicalItem?.quantity)
              : quantityEditable
                ? shippingLabel(quantity)
                : "Frete"}
          </dt>
          <dd className="font-display text-base italic text-ink">
            {quote
              ? quote.shippingCents === 0
                ? "Sem frete"
                : formatBRLFromCents(quote.shippingCents)
              : "—"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 pt-2">
          <dt className="font-medium tracking-[0.14em] uppercase">Total</dt>
          <dd className="font-display text-lg italic text-ink">
            {quote ? formatBRLFromCents(quote.totalCents) : "Valor a definir"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
