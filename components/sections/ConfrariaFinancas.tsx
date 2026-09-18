import Image from "next/image";

export default function ConfrariaFinancas() {
  return (
    <section
      id="confraria"
      aria-labelledby="confraria-heading"
      className="bg-ink"
    >
      <div className="lg:grid lg:min-h-[min(78svh,40rem)] lg:grid-cols-12">
        <div className="flex flex-col justify-center px-6 py-16 md:px-8 md:py-20 lg:col-span-5 lg:px-10 lg:py-12 xl:px-16 xl:py-20">
          <div className="max-w-[32rem]">
            <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-rule uppercase">
              Encontros & Finanças
            </p>

            <h2
              id="confraria-heading"
              className="mt-5 font-display text-[2.75rem] leading-[0.95] tracking-tight text-paper-strong md:mt-6 md:text-6xl lg:text-[3.25rem] xl:text-[4.25rem]"
            >
              <span className="block">Confraria</span>
              <span className="block">de Finanças</span>
            </h2>

            <p className="mt-5 max-w-md font-display text-lg leading-snug text-paper/80 italic md:mt-6 md:text-xl">
              Conhecimento também acontece quando pessoas se encontram.
            </p>

            <div
              aria-hidden="true"
              className="mt-8 h-px w-12 bg-rule/50 md:mt-10"
            />

            <p className="mt-8 font-sans text-base leading-relaxed text-paper/70 md:mt-10 md:text-lg">
              Um encontro criado para aproximar profissionais, empresários e
              convidados em torno de conversas sobre mercado, negócios,
              experiências e relações que vão além dos números.
            </p>

            <p className="mt-5 font-sans text-base leading-relaxed text-paper/70 md:mt-6 md:text-lg">
              Um espaço de troca, aprendizado e conexões construído a partir da
              experiência e do relacionamento.
            </p>

            <span className="mt-8 inline-flex min-h-11 cursor-default items-center font-sans text-sm text-paper-strong/45 md:mt-10 md:text-base">
              Conheça a Confraria →
            </span>
          </div>
        </div>

        <figure className="relative h-[min(56svh,26rem)] min-h-[18rem] overflow-hidden bg-photo-placeholder lg:col-span-7 lg:h-auto lg:min-h-full">
          <Image
            src="/images/confraria/confraria-financas-cinematografica.png"
            alt="Encontro da Confraria de Finanças, com o selo dourado da confraria sobre um ambiente de conversas e networking"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover object-center"
          />
        </figure>
      </div>
    </section>
  );
}
