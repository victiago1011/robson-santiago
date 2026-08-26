import Link from "next/link";

function IconBook() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M4 5.5h7.5A2.5 2.5 0 0 1 14 8v11.5H6.5A2.5 2.5 0 0 1 4 17V5.5Z" />
      <path d="M14 8h6v11.5h-6" />
      <path d="M14 8a2.5 2.5 0 0 1 2.5-2.5H20" />
    </svg>
  );
}

function IconCirculo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCiclo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 8.5A5.5 5.5 0 0 1 16.5 7L18 8.5" />
      <path d="M16.5 5.5V8.5H13.5" />
      <path d="M17 15.5A5.5 5.5 0 0 1 7.5 17L6 15.5" />
      <path d="M7.5 18.5V15.5H10.5" />
    </svg>
  );
}

function IconHorizonte() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    >
      <path d="M4 14.5h16" />
      <circle cx="12" cy="9" r="3" />
    </svg>
  );
}

const PUBLICOS = [
  {
    titulo: "Ficção com propósito",
    texto: "Para quem busca histórias que vão além do entretenimento.",
    Icone: IconBook,
  },
  {
    titulo: "Espiritualidade",
    texto: "Para leitores que buscam consciência e reflexão profunda.",
    Icone: IconCirculo,
  },
  {
    titulo: "Transformação",
    texto: "Para quem acredita no poder do amor e da mudança positiva.",
    Icone: IconCiclo,
  },
  {
    titulo: "Reflexão",
    texto: "Para quem reflete sobre os caminhos e erros da humanidade.",
    Icone: IconHorizonte,
  },
] as const;

export default function LivroParaQuem() {
  return (
    <section aria-labelledby="para-quem-heading" className="bg-paper-strong">
      <div className="mx-auto max-w-[90rem] px-6 py-12 md:px-8 md:py-14 lg:px-12 lg:py-16 xl:px-16">
        <h2
          id="para-quem-heading"
          className="text-center font-display text-[1.85rem] leading-[1.1] tracking-tight text-ink md:text-[2.35rem]"
        >
          Para quem é ideal?
        </h2>

        <ul className="mt-10 grid md:mt-12 md:grid-cols-2 lg:grid-cols-4">
          {PUBLICOS.map((item) => (
            <li
              key={item.titulo}
              className="flex gap-4 border-b border-rule py-8 last:border-b-0 md:px-6 md:odd:border-r md:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:px-8 lg:last:border-r-0 lg:first:pl-0 lg:last:pr-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rule">
                <item.Icone />
              </span>
              <div>
                <p className="font-display text-lg leading-snug tracking-tight text-ink">
                  {item.titulo}
                </p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft md:text-base">
                  {item.texto}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center md:mt-10">
          <Link
            href="/#sobre"
            className="inline-flex min-h-11 items-center font-sans text-sm text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline md:text-base"
          >
            Conheça Robson Santiago →
          </Link>
        </p>
      </div>
    </section>
  );
}
