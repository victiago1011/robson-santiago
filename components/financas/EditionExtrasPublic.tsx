import type { EditionExtras } from "@/lib/panorama/edition-extras";
import { formattedAgendaDay } from "@/lib/panorama/edition-extras";

const overline = "text-[0.69rem] font-extrabold uppercase tracking-[0.15em]";

export default function EditionExtrasPublic({ edition }: { edition?: EditionExtras }) {
  if (!edition || edition.status !== "published") return null;
  const agenda = edition.agenda_items.filter((item) => item.text.trim());
  const commentary = edition.commentary_body.trim();
  if (!agenda.length && !commentary) return null;

  return (
    <div className="mt-12 space-y-9">
      {agenda.length > 0 ? (
        <section aria-labelledby="agenda-investidor" className="overflow-hidden rounded-2xl border border-[#d7e2eb] bg-white shadow-[0_12px_36px_rgba(11,36,60,0.035)]">
          <header className="border-b border-[#dce5ed] bg-[#eef4f8] px-6 py-6 md:px-9">
            <p className={overline + " text-[#a9803d]"}>Olho no calendário</p>
            <h2 id="agenda-investidor" className="mt-2 text-2xl font-extrabold tracking-tight text-[#143551] md:text-3xl">🗓️ Agenda do Investidor</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#657c90]">
              Acontecimentos e decisões para acompanhar. Itens sem data confirmada são apresentados como pontos de atenção, não compromissos agendados.
            </p>
          </header>
          <ol className="grid gap-3 p-5 md:grid-cols-2 md:p-8">
            {agenda.map((item, i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-[#dfe7ed] bg-[#f9fbfd] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e1ebf3] text-sm font-extrabold text-[#365d77]">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-relaxed text-[#24435b]">{item.text}</p>
                  <p className="mt-2 text-xs font-semibold text-[#a37b3d]">
                    {item.on ? <time dateTime={item.on}>📅 {formattedAgendaDay(item.on)}</time> : "Em acompanhamento • Data não informada"}
                  </p>
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
