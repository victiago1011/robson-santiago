"use client";

import { FormEvent, useState } from "react";
import CustomerFields from "@/components/checkout/CustomerFields";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentPlaceholder from "@/components/checkout/PaymentPlaceholder";
import ShippingFields from "@/components/checkout/ShippingFields";
import { PHYSICAL_BOOK } from "@/lib/commerce/product";

export default function CheckoutForm() {
  const [quantity, setQuantity] = useState<number>(PHYSICAL_BOOK.minQuantity);

  const handleQuantityChange = (nextQuantity: number) => {
    setQuantity(
      Math.min(PHYSICAL_BOOK.maxQuantity, Math.max(PHYSICAL_BOOK.minQuantity, nextQuantity)),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-12 grid items-start gap-12 md:grid-cols-12 md:gap-x-10 lg:gap-x-14"
    >
      <input type="hidden" name="sku" value={PHYSICAL_BOOK.sku} />
      <input type="hidden" name="quantity" value={quantity} />

      <div className="flex min-w-0 flex-col gap-12 md:col-span-7">
        <CustomerFields />
        <ShippingFields />
      </div>

      <aside className="min-w-0 md:sticky md:top-28 md:col-span-5 md:row-span-2">
        <OrderSummary quantity={quantity} onQuantityChange={handleQuantityChange} />
      </aside>

      <div className="flex min-w-0 flex-col gap-12 md:col-span-7">
        <PaymentPlaceholder />
        <div>
          <button
            type="submit"
            disabled
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-5 font-sans text-sm font-medium tracking-[0.14em] text-paper-strong uppercase opacity-40 sm:w-auto sm:min-w-[16rem]"
          >
            Finalizar compra
          </button>
          <p className="mt-3 font-sans text-xs leading-relaxed text-ink-soft">
            Pagamento será habilitado na próxima etapa.
          </p>
        </div>
      </div>
    </form>
  );
}
