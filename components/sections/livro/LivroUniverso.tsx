const ETERNOS = [
  { nome: "Vitam", essencia: "Vida" },
  { nome: "Ananda", essencia: "Felicidade" },
    { nome: "Gaudium", essencia: "Esperança" },
  { nome: "Mettã", essencia: "Bondade" },
  { nome: "Humilitatem", essencia: "Humildade" },
  { nome: "Anasuya", essencia: "Caridade" },
  { nome: "Bhava", essencia: "Amor" },
] as const;

export default function LivroUniverso() {
  return (
    <section aria-labelledby="universo-heading" className="bg-paper">
      <div className="mx-auto grid max-w-[90rem] px-6 py-12 md:px-8 md:py-14 lg:grid-cols-12 lg:items-start lg:gap-x-16 lg:px-12 lg:py-16 xl:px-16">
        <div className="lg:col-span-6">
          <p className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-ink uppercase">
            O universo da obra
          </p>
          <h2
            id="universo-heading"
            className="mt-5 font-display text-[1.75rem] leading-[1.12] tracking-tight text-ink md:text-[2.25rem] lg:text-[2.6rem]"
          >
            E se fosse possível voltar ao passado, não para mudá-lo, mas para
            impedir que os mesmos erros acontecessem outra vez?
          </h2>
        </div>

        <div className="mt-8 lg:col-span-6 lg:mt-8">
          <p className="font-sans text-base leading-relaxed text-ink-soft md:text-lg">
            Sete seres de luz atravessam o Cosmos e retornam ao planeta Ácqua em
            momentos decisivos. Assumem diferentes avatares.
          </p>
          <p className="mt-5 font-sans text-base leading-relaxed text-ink-soft md:text-lg">
            O propósito é impedir que uma civilização destrua a si própria,
            repetindo ciclos de egoísmo, ganância, materialismo e violência.
          </p>
          <p className="mt-10 font-display text-xl leading-relaxed tracking-tight text-ink md:text-2xl">
            {ETERNOS.map((ser) => ser.nome).join(" · ")}
          </p>
          <p className="mt-4 font-sans text-[0.7rem] leading-relaxed tracking-[0.12em] text-ink-soft uppercase">
            {ETERNOS.map((ser) => ser.essencia).join("  ·  ")}
          </p>
        </div>
      </div>
    </section>
  );
}
