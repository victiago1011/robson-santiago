"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { EditorialState } from "@/lib/panorama/editorial-client";
import { longEditionDate, shortEditionDate, publishedDays } from "@/lib/panorama/daily-editions";
import type { PublicTextEdition } from "@/lib/panorama/plain-edition-store";
import { parsePanoramaEdition, splitImpact, type PanoramaSection } from "@/lib/panorama/plain-edition";
import type { EditionExtras } from "@/lib/panorama/edition-extras";
import type { MarketSnapshot } from "@/lib/panorama/market-store";
import { indicatorsForEdition } from "@/lib/panorama/market";
import MarketThermometerStrip from "@/components/financas/MarketThermometerStrip";
import { parseThermometer } from "@/lib/panorama/thermometer";

const overline = "text-[0.69rem] font-extrabold uppercase tracking-[0.15em]";
const surface = "rounded-2xl border border-[#dce5ed] bg-white shadow-[0_12px_36px_rgba(11,36,60,0.035)]";

function TextBody({ value, contrast = false }: { value: string; contrast?: boolean }) {
  if (!value.trim()) return null;
  const chunks = value.trim().split(/\n\s*\n/).filter((part) => part.trim());
  return (
    <div className={"space-y-4 text-[0.97rem] leading-[1.9] md:text-base " + (contrast ? "text-[#e0ebf4]" : "text-[#365068]")}>
      {chunks.map((chunk, index) => {
        const lines = chunk.trim().split("\n");
        const single = lines.length === 1 ? lines[0].trim() : "";
        const clean = single.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D🇧🇷🇺🇸🇪🇺🇮🇹🇫🇷🇪🇸\s]+/gu, "").trim();
        if (single && clean.length > 3 && clean.length <= 95 && clean === clean.toLocaleUpperCase("pt-BR")
            && !/^(?:[0-9,.% ]+)$/.test(clean)) {
          return <h4 key={index} className={"pt-2 text-sm font-extrabold uppercase tracking-wide " + (contrast ? "text-[#f3cf83]" : "text-[#143b58]")}>{single}</h4>;
        }
        return <p key={index} className="whitespace-pre-line">{chunk.replace(/^\s*\* /gm, "• ")}</p>;
      })}
    </div>
  );
}

function TextArticle({ section, index }: { section: PanoramaSection; index: number }) {
  const { body, impact } = splitImpact(section.body);
  return (
    <article id={"noticia-" + index} className={surface + " scroll-mt-7 overflow-hidden"}>
      <div className="px-6 py-7 sm:px-8 md:px-10 md:py-9">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#ae8542]">
          <span className="text-xl" aria-hidden="true">{section.icon || "📰"}</span>
          <span>Notícia {index + 1}</span>
        </div>
        <h3 className="mt-4 text-[1.45rem] font-extrabold leading-[1.25] tracking-tight text-[#102f4b] sm:text-[1.75rem]">{section.title}</h3>
        <div className="mt-5 border-t border-[#e5ebf0] pt-5"><TextBody value={body} /></div>
        {impact ? (
          <aside className="mt-7 rounded-xl border-l-4 border-[#d4a34e] bg-[#edf4fa] p-5 sm:p-6">
            <p className={overline + " mb-3 text-[#9c7434]"}>💡 Por que importa?</p>
            <TextBody value={impact} />
          </aside>
        ) : null}
      </div>
    </article>
  );
}

export function TextThermometer({ section }: { section: PanoramaSection }) {
  const model = parseThermometer(section.body);
  const total = model.groups.reduce((n, group) => n + group.metrics.length, 0);
  if (!total && !model.reading && !model.reference.length && !model.notes.length) return null;

  return (
    <section aria-label="Termômetro econômico" className={surface + " mt-7 overflow-hidden"}>
      <div className="border-b border-[#e0e8ef] px-5 py-6 sm:px-8">
        <p className={overline + " text-[#ab8342]"}>📊 Indicadores do mercado</p>
        <h3 className="mt-2 text-2xl font-extrabold text-[#0b2b47]">Termômetro econômico</h3>
        {model.reference.length ? (
          <div className="mt-4 rounded-xl border border-[#e3eaf1] bg-[#f6f9fb] px-4 py-3 text-[0.79rem] leading-relaxed text-[#607a8f]">
            <span className="font-extrabold text-[#25465e]">Referência: </span>
            {model.reference.join(" ").replace(/^Refer[êe]ncia:\s*/iu, "")}
          </div>
        ) : null}
      </div>
      <div className="space-y-7 p-5 sm:p-8">
        {model.groups.map((group, index) => (
          <div key={index}>
            {group.title ? (
              <h4 className="mb-3 flex items-center gap-2 border-b border-[#e6edf3] pb-2 text-xs font-extrabold uppercase tracking-[0.10em] text-[#678099]">
                {group.title}
              </h4>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.metrics.map((item, j) => {
                const comma = item.value.length > 62 ? item.value.indexOf(", ") : -1;
                const main = comma >= 0 ? item.value.slice(0, comma) : item.value;
                const detail = comma >= 0 ? item.value.slice(comma + 2) : "";
                return <div key={j} className="min-w-0 rounded-xl border border-[#dae6ee] bg-[#f5f8fb] px-4 py-4">
                  <p className="text-[0.8rem] font-semibold leading-snug text-[#59778e]">
                    {item.icon ? <span className="mr-1" aria-hidden="true">{item.icon}</span> : null}{item.label}
                  </p>
                  <p className="mt-1 break-words text-lg font-extrabold leading-snug text-[#102d47]">{main}</p>
                  {detail ? <p className="mt-2 text-xs leading-relaxed text-[#70879a]">{detail}</p> : null}
                </div>;
              })}
            </div>
          </div>
        ))}
        {model.notes.length ? (
          <p className="whitespace-pre-line border-t border-[#e6edf3] pt-4 text-xs leading-relaxed text-[#698197]">
            {model.notes.join("\n")}
          </p>
        ) : null}
        {model.hasReading ? (
          <div className="rounded-xl border-l-4 border-[#c9a15a] bg-[#f3f7fa] px-5 py-5 sm:px-7">
            <h4 className={overline + " mb-3 text-[#a27a39]"}>🔎 Leitura do mercado</h4>
            <TextBody value={model.reading} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Commentary({ section }: { section: PanoramaSection }) {
  return (
    <section id="visao-do-comentarista" aria-labelledby="commentary-title"
      className="mt-10 overflow-hidden rounded-3xl border border-[#254969] bg-[#09243e] text-white shadow-[0_18px_50px_rgba(9,36,62,.14)]">
      <div className="flex flex-col gap-7 border-b border-white/10 p-6 sm:p-9 md:flex-row md:items-center md:justify-between md:p-11">
        <div>
          <p className={overline + " text-[#edc477]"}>✍️ Editorial de Robson Santiago</p>
          <h2 id="commentary-title" className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            A visão do <span className="text-[#e4bb6b]">comentarista</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#bdcfdf]">
            Uma interpretação dos acontecimentos, com a experiência de quatro décadas no mercado financeiro.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Image src="/images/robson/robson-comentarista.jpg" alt="Retrato de Robson Santiago"
            width={112} height={112} className="h-24 w-24 rounded-full border-2 border-[#d8b16a] object-cover object-top grayscale sm:h-28 sm:w-28" />
          <div className="md:hidden"><p className="font-bold">Robson Santiago</p><p className="text-xs text-[#bdcfdf]">Comentarista</p></div>
        </div>
      </div>
      <div className="mx-auto max-w-[890px] px-6 py-8 sm:px-10 md:px-14 md:py-11">
        <TextBody value={section.body} contrast />
        <p className="mt-9 border-t border-white/15 pt-6 text-sm font-bold text-[#edc477]">Robson Santiago <span className="ml-2 font-normal text-[#a8c0d1]">• 40 anos de experiência no mercado financeiro</span></p>
      </div>
    </section>
  );
}

export default function PanoramaTextPortal({
  textEditions, legacyData, legacyExtras, legacySnapshots,
}: {
  textEditions: PublicTextEdition[];
  legacyData: EditorialState;
  legacyExtras: EditionExtras[];
  legacySnapshots: MarketSnapshot[];
}) {
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const days = useMemo(() => Array.from(new Set([
    ...textEditions.map((entry) => entry.published_on),
    ...publishedDays(legacyData.posts),
  ])).sort((a, b) => b.localeCompare(a)), [textEditions, legacyData.posts]);
  const day = chosenDay && days.includes(chosenDay) ? chosenDay : (days[0] || "");
  const text = textEditions.find((entry) => entry.published_on === day)?.published_text;
  const parsed = useMemo(() => text ? parsePanoramaEdition(text) : null, [text]);
  const oldPosts = legacyData.posts.filter((post) => post.publishedAt === day && post.status === "Publicado");
  const oldExtras = legacyExtras.find((entry) => entry.published_on === day);
  const news = parsed ? parsed.news : oldPosts.map((post, index) => ({
    number: index + 1,
    icon: "📰",
    title: post.title,
    body: post.content + (post.showImpact && post.impact ? "\n\n💡 POR QUE IMPORTA?\n" + post.impact : ""),
  }));
  const commentary = parsed?.commentary || (oldExtras?.status === "published" && oldExtras.commentary_body
    ? { number: null, icon: "✍️", title: oldExtras.commentary_title || "A VISÃO DO COMENTARISTA", body: oldExtras.commentary_body }
    : null);
  const legacySources = Array.from(new Set(oldPosts.map((post) => post.source).filter(Boolean))).join("; ");
  return (
    <main className="min-h-screen bg-[#f3f6fa] font-sans text-[#102b44]">
      <section className="relative overflow-hidden bg-[#071b33] text-white">
        <div className="pointer-events-none absolute -right-24 -top-32 h-[440px] w-[440px] rounded-full border border-[#d8a750]/25 bg-[radial-gradient(circle_at_center,#155283_0%,#092947_50%,transparent_75%)] opacity-80 sm:right-4" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1230px] px-5 py-10 md:px-8 md:py-14">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-8 bg-[#e2b564]" />
            <span className={overline + " text-[#dbb970]"}>Brasil • Mundo • Economia & Política</span>
          </div>
          <h1 className="text-[2.7rem] font-black leading-none tracking-[-0.055em] sm:text-[4.1rem] md:text-[5.3rem]">
            PANORAMA <span className="text-[#e3b965]">360°</span>
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-base font-medium text-[#dce8f1] md:text-xl">A notícia, o contexto e o que realmente importa.</p>
            <p className="rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-[#c3d4e4]">Por Robson Santiago</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1230px] px-5 pb-20 pt-9 md:px-8 md:pt-12">
        <section aria-label="Edições por data" className={surface + " overflow-hidden p-5 md:p-7"}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={overline + " text-[#a78245]"}>Panorama diário</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Escolha o dia</h2>
              <p className="mt-1 text-sm text-[#667f93]">Selecione uma edição para consultar o conteúdo completo daquela data.</p>
            </div>
            <span className="rounded-full bg-[#ecf2f7] px-3 py-1.5 text-xs font-semibold text-[#507086]">
              {days.length} {days.length === 1 ? "dia publicado" : "dias publicados"}
            </span>
          </div>
          {days.length ? (
            <div aria-label="Dias com edições publicadas" className="-mx-1 mt-6 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
              {days.map((date, index) => {
                const formatted = shortEditionDate(date);
                const active = day === date;
                return (
                  <button key={date} type="button" aria-pressed={active} onClick={() => setChosenDay(date)}
                    className={"flex min-h-[90px] min-w-[106px] snap-start flex-col items-center justify-center rounded-xl border px-4 py-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bf974f] " +
                      (active ? "border-[#0a2b49] bg-[#0a2b49] text-white shadow-md" : "border-[#dce4eb] bg-[#f8fafc] text-[#3a5a74] hover:border-[#9eafbf]")}>
                    <span className={"text-[0.65rem] font-extrabold uppercase tracking-[0.1em] " + (active ? "text-[#eac783]" : "text-[#7890a5]")}>{index === 0 ? "Mais recente" : formatted.weekday}</span>
                    <span className="mt-1 text-2xl font-extrabold leading-none">{formatted.day}</span>
                    <span className="mt-1 text-xs font-semibold uppercase">{formatted.month}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="mt-6 rounded-lg bg-[#f3f6f9] p-5 text-sm text-[#587186]">Ainda não existem edições publicadas.</p>}
        </section>

        {day ? (
          <>
            <header className="mt-10">
              <p className={overline + " text-[#b38b45]"}>Edição do dia</p>
              <h2 className="mt-2 text-[1.7rem] font-extrabold capitalize leading-tight tracking-tight md:text-4xl">{longEditionDate(day)}</h2>
              <p className="mt-2 text-sm text-[#6a8093]">{news.length} {news.length === 1 ? "notícia" : "notícias"} nesta edição</p>
            </header>

            {parsed?.opening ? (
              <section className="mt-7 overflow-hidden rounded-2xl border border-[#244e6c] bg-[#0e304e] p-6 text-white sm:p-9">
                <p className={overline + " text-[#e3b965]"}>📌 Abertura do dia</p>
                <h3 className="mt-3 text-xl font-extrabold leading-snug sm:text-2xl">{parsed.opening.title.replace(/^ABERTURA(?: DO DIA)?\s*[—–-]?\s*/iu, "") || "O cenário de hoje"}</h3>
                <div className="mt-4"><TextBody value={parsed.opening.body} contrast /></div>
              </section>
            ) : null}

            {parsed?.thermometer ? <TextThermometer section={parsed.thermometer} />
              : !parsed && indicatorsForEdition(legacySnapshots, day).length
                ? <div className="mt-7"><MarketThermometerStrip indicators={indicatorsForEdition(legacySnapshots, day)} /></div>
                : null}

            {news.length ? (
              <div className="mt-9 grid items-start gap-7 lg:grid-cols-[255px_minmax(0,1fr)]">
                <nav aria-label="Índice das notícias" className={surface + " hidden p-5 lg:sticky lg:top-6 lg:block"}>
                  <p className={overline + " text-[#a98545]"}>Nesta edição</p>
                  <ol className="mt-4 space-y-3">
                    {news.map((item, index) => <li key={index}>
                      <a href={"#noticia-" + index} className="flex gap-2 text-[0.77rem] font-semibold leading-snug text-[#48647c] hover:text-[#0e4c7b]">
                        <span className="shrink-0 font-extrabold text-[#bb914c]">{String(index + 1).padStart(2, "0")}</span>
                        <span className="line-clamp-2">{item.title}</span>
                      </a>
                    </li>)}
                    {parsed?.history?.body.trim() ? <li><a href="#marcos-historicos" className="block border-t border-[#e4ebf1] pt-4 text-xs font-extrabold text-[#9d732f]">📜 Marcos históricos</a></li> : null}
                    {commentary ? <li><a href="#visao-do-comentarista" className="block border-t border-[#e4ebf1] pt-4 text-xs font-extrabold text-[#9d732f]">✍️ Visão do Comentarista</a></li> : null}
                  </ol>
                </nav>
                <div className="min-w-0 space-y-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl font-extrabold text-[#143957]">As notícias do dia</h3>
                    <span className="text-xs text-[#688199]">Leitura integral, sem cortes</span>
                  </div>
                  {news.map((item, index) => <TextArticle key={index} section={item} index={index} />)}
                </div>
              </div>
            ) : null}
            {parsed?.history?.body.trim() ? (
              <section id="marcos-historicos" className={surface + " mt-9 scroll-mt-6 p-6 sm:p-9"}>
                <p className={overline + " text-[#b08946]"}>📜 História e contexto</p>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#102d47] sm:text-3xl">
                  Marcos históricos desta data
                </h2>
                <p className="mt-2 text-sm text-[#6b8497]">Acontecimentos registrados na edição de {longEditionDate(day)}.</p>
                <div className="mt-6 border-t border-[#e2eaf1] pt-6">
                  <TextBody value={parsed.history.body} />
                </div>
              </section>
            ) : null}
            {commentary ? <Commentary section={commentary} /> : null}
            {(parsed?.sources || legacySources) ? (
              <section className={surface + " mt-8 p-6 sm:p-8"}>
                <h3 className={overline + " text-[#9e793e]"}>Fontes e notas editoriais</h3>
                <div className="mt-4"><TextBody value={parsed?.sources || legacySources} /></div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
