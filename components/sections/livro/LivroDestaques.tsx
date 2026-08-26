function IconSete() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="12" cy="6.5" r="1.4" />
      <circle cx="6.8" cy="10.2" r="1.4" />
      <circle cx="17.2" cy="10.2" r="1.4" />
      <circle cx="8.2" cy="16.5" r="1.4" />
      <circle cx="15.8" cy="16.5" r="1.4" />
      <circle cx="4.8" cy="14.2" r="1.1" />
      <circle cx="19.2" cy="14.2" r="1.1" />
    </svg>
  );
}

function IconMundo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="12" cy="12" r="7.5" />
      <path d="M4.5 12h15" />
      <path d="M12 4.5c2.2 2.4 3.3 4.9 3.3 7.5S14.2 17.1 12 19.5C9.8 17.1 8.7 14.6 8.7 12S9.8 6.9 12 4.5Z" />
    </svg>
  );
}

function IconPar() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="9" cy="12" r="3.2" />
      <circle cx="15" cy="12" r="3.2" />
    </svg>
  );
}

function IconEixos() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

const DESTAQUES = [
  {
    titulo: "Sete seres. Sete essências.",
    texto:
      "Eternos-Iluminados — também chamados Incandescentes — que retornam em momentos decisivos.",
    Icone: IconSete,
  },
  {
    titulo: "O planeta Ácqua.",
    texto: "Outro mundo. Mas talvez não seja tão diferente do nosso.",
    Icone: IconMundo,
  },
  {
    titulo: "Vitam e Ananda.",
    texto:
      "Um amor que atravessa existências — e um propósito que os conduz a tempos distintos.",
    Icone: IconPar,
  },
  {
    titulo: "Tempo, propósito, amor e conhecimento.",
    texto: "A narrativa utiliza a ficção para provocar reflexão.",
    Icone: IconEixos,
  },
] as const;

export default function LivroDestaques() {
  return (
    <section
      id="encontrar"
      aria-labelledby="destaques-heading"
      className="bg-paper-strong"
    >
      <h2 id="destaques-heading" className="sr-only">
        Destaques da obra
      </h2>
      <div className="mx-auto max-w-[90rem] px-6 py-10 md:px-8 md:py-12 lg:px-12 lg:py-14 xl:px-16">
        <ul className="grid md:grid-cols-2 lg:grid-cols-4">
          {DESTAQUES.map((item) => (
            <li
              key={item.titulo}
              className="border-b border-rule py-8 last:border-b-0 md:px-6 md:py-6 md:odd:border-r md:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:px-8 lg:last:border-r-0 lg:first:pl-0 lg:last:pr-0"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-rule">
                <item.Icone />
              </span>
              <p className="mt-5 font-display text-lg leading-snug tracking-tight text-ink">
                {item.titulo}
              </p>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft md:text-base">
                {item.texto}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
