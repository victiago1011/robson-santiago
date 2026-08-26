import LivroCapa from "@/components/sections/livro/LivroCapa";

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

export default function LivroHero() {
  return (
    <section aria-labelledby="livro-hero-heading" className="relative overflow-hidden bg-ink">
      <div className="mx-auto grid max-w-[90rem] px-6 py-12 md:px-8 md:py-16 lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:px-12 lg:py-20 xl:px-16">
        <div className="lg:col-span-6 lg:col-start-1">
          <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-rule uppercase">
            Livro
          </p>
          <h1
            id="livro-hero-heading"
            className="mt-5 font-display text-[2.5rem] leading-[1.05] tracking-tight text-paper-strong md:mt-6 md:text-5xl lg:text-6xl xl:text-[4.25rem]"
          >
            A Vida é um Dia
          </h1>
          <p className="mt-4 max-w-md font-display text-lg leading-snug text-paper/75 italic md:mt-5 md:text-xl">
            O momento é mais valioso do que o tempo.
          </p>
          <p className="mt-8 max-w-[32rem] font-sans text-base leading-relaxed text-paper/70 md:mt-10 md:text-lg">
            Uma ficção sobre tempo, escolhas e os ciclos que a humanidade
            insiste em repetir.
          </p>
          <div className="mt-10 flex flex-col items-start gap-4 md:mt-12">
            <a
              href="#comprar"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-paper-strong px-5 font-sans text-sm font-medium tracking-[0.14em] text-ink uppercase hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper-strong/70"
            >
              <IconCart />
              Adquirir o livro
            </a>
            <a
              href="#encontrar"
              className="inline-flex min-h-11 items-center font-sans text-sm text-paper/65 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline md:text-base"
            >
              Conheça a história ↓
            </a>
          </div>
        </div>

        <LivroCapa
          glow
          preload
          sizes="(min-width: 1280px) 22rem, (min-width: 1024px) 20rem, (min-width: 768px) 16rem, 13rem"
          className="mx-auto mt-12 w-full max-w-[13rem] md:max-w-[16rem] lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mx-0 lg:mt-0 lg:max-w-[20rem] xl:max-w-[22rem]"
        />
      </div>
    </section>
  );
}
