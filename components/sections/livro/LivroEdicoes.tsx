import Link from "next/link";

function IconCart() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M3 4h2l2.2 11h11.3l1.8-7H7" />
    </svg>
  );
}

function IconLivro() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M4 5.5h7.5A2.5 2.5 0 0 1 14 8v11.5H6.5A2.5 2.5 0 0 1 4 17V5.5Z" />
      <path d="M14 8h6v11.5h-6" />
      <path d="M14 8a2.5 2.5 0 0 1 2.5-2.5H20" />
    </svg>
  );
}

function IconDispositivo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <rect x="6" y="3.5" width="12" height="17" rx="1.5" />
      <path d="M10 17.5h4" strokeLinecap="round" />
    </svg>
  );
}

function DisplayPrice({ value }: { value: string }) {
  return <p className="mt-3 font-display text-2xl tracking-tight text-ink">{value}</p>;
}

export default function LivroEdicoes() {
  return (
    <section
      id="comprar"
      aria-labelledby="comprar-heading"
      className="bg-paper"
    >
      <div className="mx-auto max-w-[90rem] px-6 py-12 md:px-8 md:py-14 lg:px-12 lg:py-16 xl:px-16">
        <div className="mx-auto w-full max-w-[56rem] rounded-xl border border-rule bg-paper-strong px-6 py-10 md:px-10 md:py-12">
          <h2
            id="comprar-heading"
            className="text-center font-display text-[1.85rem] leading-[1.1] tracking-tight text-ink md:text-[2.35rem]"
          >
            Escolha como ler
          </h2>

          <ul className="mt-10 grid divide-y divide-rule md:mt-12 md:grid-cols-2 md:divide-x md:divide-y-0">
            <li className="flex flex-col items-center px-2 py-8 text-center md:px-10 md:py-2 md:pr-12">
              <IconLivro />
              <p className="mt-5 font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
                Livro físico
              </p>
              <DisplayPrice value="R$ 39,90" />
              <p className="mt-2 font-display text-base text-ink-soft italic">Frete a consultar</p>
              <Link
                href="/livro/comprar?opcao=fisico"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-medium tracking-[0.12em] text-paper-strong uppercase whitespace-nowrap hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                <IconCart />
                Comprar livro físico
              </Link>
            </li>
            <li className="flex flex-col items-center px-2 py-8 text-center md:px-10 md:py-2 md:pl-12">
              <IconDispositivo />
              <p className="mt-5 font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
                E-book
              </p>
              <DisplayPrice value="R$ 19,90" />
              <p className="mt-2 max-w-[16rem] font-display text-base text-ink-soft italic">
                Entrega digital após confirmação do pagamento
              </p>
              <Link
                href="/livro/comprar?opcao=ebook"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 font-sans text-sm font-medium tracking-[0.12em] text-paper-strong uppercase whitespace-nowrap hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                <IconCart />
                Comprar e-book
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
