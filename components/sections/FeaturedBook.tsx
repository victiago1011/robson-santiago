import Image from "next/image";

export default function FeaturedBook() {
  return (
    <section aria-labelledby="livro-heading" className="bg-paper">
      <div className="mx-auto grid max-w-[90rem] px-6 py-14 md:px-8 md:py-20 lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:px-12 lg:py-24 xl:px-16">
        <figure className="mx-auto w-full max-w-[15rem] justify-self-center md:max-w-[18rem] lg:col-span-6 lg:col-start-7 lg:max-w-[22rem] xl:max-w-[24rem]">
          <Image
            src="/images/books/a-vida-e-um-dia.png"
            alt="Capa do livro A Vida é um Dia, de Robson Santiago"
            width={794}
            height={1285}
            sizes="(min-width: 1280px) 24rem, (min-width: 1024px) 22rem, (min-width: 768px) 18rem, 15rem"
            className="h-auto w-full object-contain"
          />
        </figure>

        <div className="mt-8 lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:mt-0">
          <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
            Livro
          </p>
          <h2
            id="livro-heading"
            className="mt-6 font-display text-[2rem] leading-[1.1] tracking-tight text-ink md:mt-8 md:text-[2.5rem] lg:text-[3.5rem] xl:text-[3.75rem]"
          >
            A Vida é um Dia
          </h2>
          <p className="mt-4 max-w-md font-display text-lg leading-snug text-ink-soft italic md:mt-5 md:text-xl">
            O momento é mais valioso do que o tempo.
          </p>
          <p className="mt-6 max-w-[32rem] font-sans text-base leading-relaxed text-ink-soft md:mt-8 md:text-lg">
            Uma narrativa sobre retorno, escolhas e humanidade em um mundo à
            beira do colapso — onde o valor do momento se torna central.
          </p>
        </div>
      </div>
    </section>
  );
}
