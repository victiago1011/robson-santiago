"use client";

import { FormEvent, useEffect, useState } from "react";
import CustomerFields from "@/components/checkout/CustomerFields";
import OrderSummary from "@/components/checkout/OrderSummary";
import ShippingFields from "@/components/checkout/ShippingFields";
import { PHYSICAL_BOOK } from "@/lib/commerce/product";
import type { PublicQuote } from "@/lib/commerce/quote";
import type { PurchaseKind } from "@/lib/commerce/selection";

type CheckoutFormProps = {
  kind: PurchaseKind;
  initialQuote: PublicQuote | null;
};

type RemoteQuoteState = {
  quantity: number;
  ebookBump: boolean;
  quote: PublicQuote;
};

export default function CheckoutForm({ kind, initialQuote }: CheckoutFormProps) {
  const [quantity, setQuantity] = useState<number>(
    kind === "physical" ? PHYSICAL_BOOK.minQuantity : 1,
  );
  const [ebookBump, setEbookBump] = useState(false);
  const [remote, setRemote] = useState<RemoteQuoteState | null>(null);

  const handleQuantityChange = (nextQuantity: number) => {
    setQuantity(
      Math.min(PHYSICAL_BOOK.maxQuantity, Math.max(PHYSICAL_BOOK.minQuantity, nextQuantity)),
    );
  };

  const isDefaultPhysical =
    kind === "physical" && quantity === PHYSICAL_BOOK.minQuantity && ebookBump === false;
  const needsRemoteQuote = kind === "physical" && !isDefaultPhysical;

  useEffect(() => {
    if (!needsRemoteQuote) {
      return;
    }

    let cancelled = false;

    void fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "physical", quantity, ebookBump }),
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (cancelled) return;
        if (
          typeof data === "object" &&
          data !== null &&
          "ok" in data &&
          data.ok === true &&
          "quote" in data
        ) {
          setRemote({
            quantity,
            ebookBump,
            quote: data.quote as PublicQuote,
          });
        }
      })
      .catch(() => {
        // Keep the last successful quote; do not invent totals in the browser.
      });

    return () => {
      cancelled = true;
    };
  }, [needsRemoteQuote, quantity, ebookBump]);

  const quote =
    kind !== "physical" || isDefaultPhysical
      ? initialQuote
      : remote && remote.quantity === quantity && remote.ebookBump === ebookBump
        ? remote.quote
        : initialQuote;
  const quoting =
    needsRemoteQuote && !(remote && remote.quantity === quantity && remote.ebookBump === ebookBump);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const requiresShipping = kind !== "digital";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-12 grid items-start gap-12 md:grid-cols-12 md:gap-x-10 lg:gap-x-14"
    >
      <input type="hidden" name="kind" value={kind} />
      {kind === "physical" ? <input type="hidden" name="quantity" value={quantity} /> : null}
      {kind === "physical" ? <input type="hidden" name="ebook_bump" value={ebookBump ? "true" : "false"} /> : null}

      <div className="flex min-w-0 flex-col gap-12 md:col-span-7">
        <CustomerFields />
        {requiresShipping ? <ShippingFields /> : null}
        {kind === "digital" ? (
          <p className="font-sans text-sm leading-relaxed text-ink-soft">
            Entrega digital após confirmação do pagamento.
          </p>
        ) : null}
      </div>

      <aside className="flex min-w-0 flex-col gap-8 md:sticky md:top-28 md:col-span-5">
        <OrderSummary
          quote={quote}
          quantity={quantity}
          quantityEditable={kind === "physical"}
          onQuantityChange={kind === "physical" ? handleQuantityChange : undefined}
          quoting={quoting}
          ebookBump={ebookBump}
          onEbookBumpChange={kind === "physical" ? setEbookBump : undefined}
        />
        <div>
          <button
            type="submit"
            disabled
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-5 font-sans text-sm font-medium tracking-[0.14em] text-paper-strong uppercase opacity-40"
          >
            Finalizar compra
          </button>
          <p className="mt-3 font-sans text-xs leading-relaxed text-ink-soft">
            Pagamento será habilitado na próxima etapa.
          </p>
        </div>
      </aside>
    </form>
  );
}
