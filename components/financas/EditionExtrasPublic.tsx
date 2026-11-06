import type { EditionExtras } from "@/lib/panorama/edition-extras";


const overline = "text-[0.69rem] font-extrabold uppercase tracking-[0.15em]";

export default function EditionExtrasPublic({ edition }: { edition?: EditionExtras }) {
  if (!edition || edition.status !== "published") return null;
  const historical = edition.historical_events.filter((item) => item.title.trim());
  const commentary = edition.commentary_body.trim();
  if (!historical.length && !commentary) return null;

  return (
    <div className="mt-12 space-y-9">
      {historical.length > 0 ? (
        <section id="marcos-historicos" aria-labelledby="historical-title"
          className="scroll-mt-8 overflow-hidden rounded-2xl border border-[#d7e2eb] bg-white shadow-[0_12px_36px_rgba(11,36,60,0.035)]">
          <header className="border-b border-[#dce5ed] bg-[#eef4f8] px-6 py-6 md:px-9">
            <p className={overline + " text-[#a9803d]"}>Uma viagem no tempo</p>
            <h2 id="historical-title" className="mt-2 text-2xl font-extrabold tracking-tight text-[#143551] md:text-3xl">
              📜 Marcos Históricos desta Data
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#657c90]">
              Fatos selecionados de outros anos que aconteceram neste mesmo dia e mês.
            </p>
          </header>
          <ol className="relative space-y-3 p-5 md:p-8">
            {historical.map((item,i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-[#dfe7ed] bg-[#f9fbfd] p-5">
                <span className="inline-flex h-11 min-w-16 shrink-0 items-center justify-center rounded-xl bg-[#0d3553] px-2 text-sm font-black text-[#e9c47b]">
                  {item.year}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-snug text-[#153a57]">{item.title}</h3>
                  {item.description ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#4a687c]">{item.description}</p> : null}
                  {item.source ? <p className="mt-3 break-words text-xs text-[#72879a]">Fonte: {item.source}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {commentary ? (
        <section aria-labelledby="visao-comentarista" className="overflow-hidden rounded-2xl border border-[#254965] bg-[#082b48] text-white shadow-[0_20px_45px_rgba(10,42,75,0.13)]">
          <div className="border-b border-white/10 px-6 py-7 md:px-10 md:py-9">
            <p className={overline + " text-[#e6be75]"}>Editorial • análise assinada</p>
            <h2 id="visao-comentarista" className="mt-3 text-2xl font-extrabold tracking-tight md:text-4xl">✍️ A Visão do Comentarista</h2>
            {edition.commentary_title.trim() ? <h3 className="mt-4 text-lg font-bold leading-snug text-[#f3d497] md:text-2xl">{edition.commentary_title}</h3> : null}
          </div>
          <div className="space-y-5 px-6 py-7 md:px-10 md:py-10">
            {commentary.split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line text-[0.98rem] leading-[1.95] text-[#e3edf5] md:text-base">{paragraph}</p>
            ))}
            <div className="mt-7 border-t border-white/20 pt-6">
              <p className="font-bold tracking-tight text-[#f2cf8f]">Robson Santiago</p>
              <p className="mt-1 text-xs text-[#b4cbdc]">Panorama 360° • A notícia, o contexto e o que realmente importa.</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
