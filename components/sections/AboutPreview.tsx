const pillars = [
  {
    number: "01",
    title: "Mercado Financeiro",
    lead: "Mais de 40 anos de experiência",
    body: "Uma trajetória construída acompanhando empresas, empresários, executivos e diferentes ciclos do mercado financeiro.",
  },
  {
    number: "02",
    title: "Pessoas & Relacionamentos",
    lead: "Conhecimento também nasce da troca",
    body: "Décadas de conversas, conexões e experiências que reforçam a importância de ouvir, aprender e construir relações duradouras.",
  },
  {
    number: "03",
    title: "Livros & Reflexões",
    lead: "Aprendizado contínuo",
    body: "A leitura e a escrita fazem parte de uma busca permanente por novas ideias, perspectivas e formas de compreender a vida.",
  },
  {
    number: "04",
    title: "Projetos com Propósito",
    lead: "Conhecimento transformado em ação",
    body: "Livros, encontros e iniciativas que procuram compartilhar experiências e contribuir para a qualidade de vida das pessoas.",
  },
] as const;

export default function AboutPreview() {
  return (
    <section id="sobre" aria-labelledby="sobre-heading" className="bg-paper-strong">
      <div className="mx-auto max-w-[90rem] px-6 py-12 md:px-8 md:py-28 lg:px-12 lg:py-36 xl:px-16">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16">
          <div className="lg:col-span-5">
            <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
              Sobre
            </p>
            <h2
              id="sobre-heading"
              className="mt-5 max-w-[28rem] font-display text-[1.7rem] leading-[1.18] tracking-tight text-ink md:mt-10 md:text-[2.5rem] md:leading-[1.12] lg:text-[2.75rem] xl:text-[3.25rem]"
            >
              Uma trajetória construída entre pessoas, conhecimento e experiência.
            </h2>
            <p className="mt-5 max-w-[28rem] font-sans text-base leading-relaxed text-ink-soft md:mt-10 md:text-lg">
              Há mais de quatro décadas, Robson Santiago constrói uma trajetória
              marcada pelo mercado financeiro, pelas relações humanas, pelo
              aprendizado contínuo e pela vontade de compartilhar conhecimento.
            </p>
          </div>

          <ol className="mt-8 border-t border-rule lg:col-span-6 lg:col-start-7 lg:mt-0 lg:border-t-0">
            {pillars.map((pillar, index) => (
              <li
                key={pillar.number}
                className={`grid grid-cols-[auto_1fr] gap-x-5 py-5 md:gap-x-8 md:py-9 ${
                  index === 0 ? "lg:pt-0" : "border-t border-rule"
                }`}
              >
                <p className="pt-1 font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink-soft tabular-nums">
                  {pillar.number}
                </p>
                <div>
                  <h3 className="font-display text-[1.35rem] leading-tight tracking-tight text-ink md:text-[1.5rem]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 font-display text-base leading-snug text-ink-soft italic md:text-lg">
                    {pillar.lead}
                  </p>
                  <p className="mt-3 max-w-[32rem] font-sans text-sm leading-relaxed text-ink-soft md:mt-4 md:text-base">
                    {pillar.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
