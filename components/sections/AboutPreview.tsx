export default function AboutPreview() {
  return (
    <section aria-labelledby="sobre-heading" className="bg-paper-strong">
      <div className="mx-auto max-w-[90rem] px-6 py-20 md:px-8 md:py-28 lg:px-12 lg:py-36 xl:px-16">
        <h2
          id="sobre-heading"
          className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase"
        >
          Sobre
        </h2>
        <p className="mt-8 max-w-[40rem] font-display text-[1.85rem] leading-[1.15] tracking-tight text-ink md:mt-10 md:text-[2.5rem] md:leading-[1.12] lg:text-5xl xl:text-[3.25rem]">
          Entre livros, experiências e perguntas, Robson Santiago construiu
          uma trajetória movida pela curiosidade e pela busca de sentido.
        </p>
        <p className="mt-8 max-w-[32rem] font-sans text-base leading-relaxed text-ink-soft md:mt-10 md:text-lg">
          Escritor e pesquisador, reúne uma longa trajetória profissional a um
          interesse profundo por história, conhecimento e propósito. Hoje,
          transforma essas experiências em livros, conversas, reflexões e
          projetos.
        </p>
      </div>
    </section>
  );
}
