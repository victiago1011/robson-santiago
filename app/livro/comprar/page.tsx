import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { PHYSICAL_BOOK } from "@/lib/commerce/product";

export const metadata: Metadata = {
  title: "Comprar A Vida é um Dia — Robson Santiago",
  description:
    "Finalize a compra do livro físico A Vida é um Dia, de Robson Santiago.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ComprarLivroPage() {
  return (
    <main className="flex flex-1 flex-col bg-paper">
      <div className="mx-auto w-full max-w-[90rem] px-6 py-10 md:px-8 md:py-14 lg:px-12 lg:py-16 xl:px-16">
        <Link
          href="/livro"
          className="inline-flex min-h-11 items-center font-sans text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:outline-none focus-visible:underline"
        >
          ← Voltar ao livro
        </Link>

        <header className="mt-8 flex items-start gap-5 md:mt-10 md:gap-6">
          <Image
            src={PHYSICAL_BOOK.coverSrc}
            alt={PHYSICAL_BOOK.coverAlt}
            width={794}
            height={1285}
            sizes="5.5rem"
            className="h-auto w-[4.25rem] shrink-0 object-contain md:w-[5.5rem]"
          />
          <div className="min-w-0 pt-0.5">
            <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink-soft uppercase">
              Finalizar compra
            </p>
            <h1 className="mt-3 font-display text-[2rem] leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-[2.75rem]">
              {PHYSICAL_BOOK.title}
            </h1>
            <p className="mt-2 font-display text-lg text-ink-soft italic">{PHYSICAL_BOOK.author}</p>
            <p className="mt-3 font-sans text-sm text-ink">{PHYSICAL_BOOK.format}.</p>
          </div>
        </header>

        <CheckoutForm />
      </div>
    </main>
  );
}
