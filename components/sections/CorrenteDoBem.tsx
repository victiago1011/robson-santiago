import Image from "next/image";

const CORRENTE_URL = "https://www.correntedobembr.com.br/";

export default function CorrenteDoBem() {
  return (
    <section aria-labelledby="corrente-heading" className="bg-paper">
      <div className="lg:grid lg:min-h-[min(85svh,46rem)] lg:grid-cols-2">
        <figure className="relative h-[min(70svh,32rem)] min-h-[20rem] bg-photo-placeholder lg:h-auto lg:min-h-full">
          <Image
            src="/images/corrente-humana.png"
            alt="Grupo de pessoas em um momento de apoio, com sorrisos e um aperto de mãos"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-[42%_46%] md:object-[40%_42%] lg:object-[38%_44%]"
          />
        </figure>

        <div className="flex flex-col justify-center px-6 py-16 md:px-8 md:py-20 lg:px-12 lg:py-24 xl:px-16">
          <div className="max-w-[32rem]">
            <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
              Projeto
            </p>

            <h2
              id="corrente-heading"
              className="mt-5 font-display text-[3.5rem] leading-[0.9] tracking-tight text-ink md:mt-8 md:text-6xl lg:text-7xl xl:text-[5.5rem]"
            >
              <span className="block">Corrente</span>
              <span className="block">do Bem</span>
            </h2>

            <p className="mt-5 max-w-md font-display text-lg leading-snug text-ink-soft italic md:mt-6 md:text-xl">
              Uma ideia simples:
              <br />
              ajudar o próximo.
            </p>

            <div
              aria-hidden="true"
              className="mt-8 h-px w-12 bg-rule md:mt-10"
            />

            <p className="mt-8 font-sans text-base leading-relaxed text-ink-soft md:mt-10 md:text-lg">
              O que começou por volta de 2005 como uma forma de ajudar amigos na
              recolocação profissional foi crescendo por indicações, contatos e
              pessoas dispostas a ajudar outras pessoas.
            </p>

            <a
              href={CORRENTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex min-h-11 items-center font-sans text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline md:mt-10 md:text-base"
            >
              Conhecer a Corrente do Bem →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
