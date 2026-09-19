"use client";

import { formatBRLFromCents } from "@/lib/commerce/money";

type EbookBumpOfferProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  listPriceCents: number | null;
  bumpPriceCents: number | null;
};

export default function EbookBumpOffer({
  checked,
  onChange,
  listPriceCents,
  bumpPriceCents,
}: EbookBumpOfferProps) {
  return (
    <section
      aria-labelledby="ebook-bump-heading"
      className="mt-6 rounded-xl border border-rule bg-paper-strong px-5 py-6 md:px-7"
    >
      <h2
        id="ebook-bump-heading"
        className="font-display text-xl tracking-tight text-ink md:text-[1.35rem]"
      >
        Leve também o e-book
      </h2>
      <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">
        Tenha a versão digital de <span className="italic">A Vida é um Dia</span> para ler onde quiser.
      </p>

      {listPriceCents !== null && bumpPriceCents !== null ? (
        <p className="mt-4 font-display text-base text-ink">
          <span className="text-ink-soft italic line-through">{formatBRLFromCents(listPriceCents)}</span>
          <span className="mx-2 text-ink-soft">por</span>
          <span>+ {formatBRLFromCents(bumpPriceCents)}</span>
        </p>
      ) : (
        <p className="mt-4 font-display text-base text-ink-soft italic">Valor a definir</p>
      )}

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="ebook_bump"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded-sm border-rule accent-ink"
        />
        <span className="font-sans text-sm leading-relaxed text-ink">
          Adicionar e-book ao meu pedido
        </span>
      </label>
    </section>
  );
}
