const modules = [
  {
    title: "Conteúdo & Curadoria",
    lead: "Informação que circula",
    body: "Leitura, seleção e compartilhamento recorrente de notícias, análises e conteúdos produzidos por fontes especializadas em economia, mercados e gestão.",
  },
  {
    title: "Conexões",
    lead: "Conversas que geram novas perspectivas",
    body: "Trocas constantes com empresários, CFOs, executivos e profissionais sobre economia, mercado, gestão, investimentos e decisões financeiras.",
  },
  {
    title: "Projetos Financeiros",
    lead: "Experiência que se transforma em novas iniciativas",
    body: "A Confraria de Finanças, os conteúdos financeiros do VEZ e futuros projetos ajudam a ampliar esse ecossistema de conhecimento e relacionamento.",
  },
] as const;

export default function FinancePreview() {
  return (
    <section id="financas" aria-labelledby="financas-heading" className="bg-paper">
      <div className="mx-auto max-w-[90rem] px-6 py-20 md:px-8 md:py-28 lg:px-12 lg:py-36 xl:px-16">
        <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
          Finanças & Mercado
        </p>
        <h2
          id="financas-heading"
          className="mt-8 max-w-[44rem] font-display text-[1.85rem] leading-[1.15] tracking-tight text-ink md:mt-10 md:text-[2.5rem] md:leading-[1.12] lg:text-5xl xl:text-[3.25rem]"
        >
          Mais de quatro décadas vivendo o mercado financeiro.
        </h2>
        <p className="mt-8 max-w-[40rem] font-sans text-base leading-relaxed text-ink-soft md:mt-10 md:text-lg">
          Finanças continuam sendo um dos pilares centrais da trajetória de
          Robson Santiago. Mais do que experiência acumulada, essa vivência
          segue presente nas conversas, conexões, conteúdos e projetos que
          fazem parte do seu dia a dia.
        </p>

        <div className="mt-12 border-t border-rule md:mt-16 lg:mt-20 lg:grid lg:grid-cols-12 lg:border lg:border-rule">
          <article className="bg-paper-strong py-10 md:py-12 lg:col-span-7 lg:flex lg:flex-col lg:justify-center lg:border-r lg:border-rule lg:px-12 lg:py-16 xl:px-16">
            <h3 className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
              Experiência de Mercado
            </h3>
            <p className="mt-8 font-display text-[2rem] leading-none tracking-tight text-ink md:mt-10 md:text-[2.35rem] lg:text-[2.75rem]">
              +40 anos
            </p>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft md:text-base">
              de mercado financeiro
            </p>
            <p className="mt-8 max-w-[22rem] font-display text-xl leading-snug tracking-tight text-ink italic md:mt-10 md:max-w-[28rem] md:text-[1.65rem] lg:text-[1.85rem]">
              Vivência que atravessa diferentes ciclos
            </p>
            <div aria-hidden="true" className="mt-8 h-px w-12 bg-rule md:mt-10" />
            <p className="mt-8 max-w-[32rem] font-sans text-base leading-relaxed text-ink-soft md:mt-10 md:text-lg">
              Mais de quatro décadas acompanhando empresas, empresários,
              executivos e as transformações do ambiente econômico e financeiro.
            </p>
          </article>

          <div className="grid border-t border-rule md:grid-cols-3 lg:col-span-5 lg:grid-cols-1 lg:border-t-0">
            {modules.map((module, index) => (
              <article
                key={module.title}
                className={`py-8 md:px-6 md:py-8 lg:px-8 lg:py-9 xl:px-10 ${
                  index > 0
                    ? "border-t border-rule md:border-t-0 md:border-l lg:border-l-0 lg:border-t"
                    : ""
                }`}
              >
                <h3 className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
                  {module.title}
                </h3>
                <p className="mt-3 font-display text-lg leading-snug tracking-tight text-ink md:text-xl">
                  {module.lead}
                </p>
                <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft md:mt-4">
                  {module.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
