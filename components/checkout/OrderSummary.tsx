import { PHYSICAL_BOOK } from "@/lib/commerce/product";

type OrderSummaryProps = {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
};

export default function OrderSummary({ quantity, onQuantityChange }: OrderSummaryProps) {
  const decreaseDisabled = quantity <= PHYSICAL_BOOK.minQuantity;
  const increaseDisabled = quantity >= PHYSICAL_BOOK.maxQuantity;

  return (
    <section
      aria-labelledby="pedido-heading"
      className="rounded-xl border border-rule bg-paper-strong px-5 py-7 md:px-7 md:py-8"
    >
      <h2 id="pedido-heading" className="font-display text-2xl tracking-tight text-ink md:text-[1.75rem]">
        Seu pedido
      </h2>

      <div className="mt-6 border-b border-rule pb-6">
        <p className="font-sans text-base text-ink">{PHYSICAL_BOOK.title}</p>
        <p className="mt-1 font-display text-base text-ink-soft italic">{PHYSICAL_BOOK.format}</p>
      </div>

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

      <dl className="space-y-3 border-t border-rule pt-6 font-sans text-sm text-ink">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd className="font-display text-base italic text-ink-soft">—</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-soft">Frete</dt>
          <dd className="font-display text-base italic text-ink-soft">—</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 pt-2">
          <dt className="font-medium tracking-[0.14em] uppercase">Total</dt>
          <dd className="font-display text-lg italic text-ink">Valor a definir</dd>
        </div>
      </dl>
    </section>
  );
}
