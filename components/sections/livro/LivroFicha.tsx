const FICHA = [
  { rotulo: "Gênero", valor: "Ficção" },
  { rotulo: "Idioma", valor: "Português" },
  { rotulo: "Edições", valor: "Físico / Digital" },
  { rotulo: "ISBN", valor: "978-85-7146-160-4" },
] as const;

export default function LivroFicha() {
  return (
    <section aria-labelledby="ficha-heading" className="bg-ink">
      <h2 id="ficha-heading" className="sr-only">
        Ficha da obra
      </h2>
      <div className="mx-auto max-w-[90rem] px-6 py-10 md:px-8 md:py-11 lg:px-12 xl:px-16">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4 md:gap-x-10">
          {FICHA.map((item) => (
            <div key={item.rotulo}>
              <dt className="font-sans text-[0.7rem] font-medium tracking-[0.22em] text-rule uppercase">
                {item.rotulo}
              </dt>
              <dd className="mt-3 font-display text-lg leading-tight tracking-tight break-words text-paper-strong md:text-xl lg:text-[1.35rem]">
                {item.valor}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
