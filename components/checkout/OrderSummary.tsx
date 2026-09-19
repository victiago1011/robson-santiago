"use client";

import { PHYSICAL_BOOK } from "@/lib/commerce/product";
import { formatBRLFromCents } from "@/lib/commerce/money";
import type { PublicQuote } from "@/lib/commerce/quote";

type OrderSummaryProps = {
  quote: PublicQuote | null;
  quantity: number;
  quantityEditable: boolean;
  onQuantityChange?: (quantity: number) => void;
  quoting?: boolean;
};

export default function OrderSummary({
  quote,
  quantity,
  quantityEditable,
  onQuantityChange,
  quoting = false,
}: OrderSummaryProps) {
  const decreaseDisabled = quantity <= PHYSICAL_BOOK.minQuantity;
  const increaseDisabled = quantity >= PHYSICAL_BOOK.maxQuantity;
  const showDiscount = (quote?.discountCents ?? 0) > 0;

  return (
    <section
      aria-labelledby="pedido-heading"
      className="rounded-xl border border-rule bg-paper-strong px-5 py-7 md:px-7 md:py-8"
    >
      <h2 id="pedido-heading" className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Seu pedido
      </h2>

      <div className="mt-6 border-b border-rule pb-6">
        {quote ? (
          <ul className="space-y-4">
            {quote.items.map((item) => (
              <li key={item.sku} className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-sans text-base text-ink">{item.title}</p>
                  {item.quantity > 1 ? (
                    <p className="mt-1 font-display text-base text-ink-soft italic">
                      {item.quantity} × {formatBRLFromCents(item.unitPriceCents)}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 font-display text-base italic text-ink">
                  {formatBRLFromCents(item.lineTotalCents)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-display text-base text-ink-soft italic">Resumo indisponível no momento.</p>
        )}
      </div>

      {quantityEditable && onQuantityChange ? (
        <div className="flex items-center justify-between gap-4 py-6">
          <p className="font-sans text-[0.7rem] font-medium tracking-[0.18em] text-ink uppercase">
            Quantidade
          </p>
          <div className="inline-flex items-center rounded-lg border border-rule">
            <button
              type="button"
              onClick={() => onQuantityChange(quantity - 1)}
              disabled={decreaseDisabled}
              aria-label="Diminuir quantidade"
              className="inline-flex min-h-11 min-w-11 items-center justify-center font-sans text-lg text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              −
            </button>
            <span aria-live="polite" className="min-w-8 text-center font-sans text-base tabular-nums text-ink">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantityChange(quantity + 1)}
              disabled={increaseDisabled}
              aria-label="Aumentar quantidade"
              className="inline-flex min-h-11 min-w-11 items-center justify-center font-sans text-lg text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <p className="py-6 font-sans text-sm text-ink-soft">Quantidade: {quantity}</p>
      )}

      <dl className={`space-y-3 border-t border-rule pt-6 font-sans text-sm text-ink ${quoting ? "opacity-70" : ""}`}>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd className="font-display text-base italic text-ink">
            {quote ? formatBRLFromCents(quote.subtotalCents) : "—"}
          </dd>
        </div>
        {showDiscount && quote ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Desconto e-book</dt>
            <dd className="font-display text-base italic text-ink">
              − {formatBRLFromCents(quote.discountCents)}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-soft">Frete</dt>
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
