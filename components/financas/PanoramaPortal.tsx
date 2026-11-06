"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  formatEditorialDate,
  usePanoramaContent,
  type EditorialPost,
  type EditorialState,
} from "@/lib/panorama/editorial-client";
import { selectMinuteBriefing } from "@/lib/panorama/briefing";
import MarketThermometerStrip from "@/components/financas/MarketThermometerStrip";
import TopicIcon from "@/components/financas/TopicIcon";
import type { MarketIndicator } from "@/lib/panorama/market";
import {
  groupNewsByTopic,
  longEditionDate,
  publishedDays,
  shortEditionDate,
  uniqueTopicSources,
} from "@/lib/panorama/daily-editions";

const overline = "text-[0.69rem] font-extrabold uppercase tracking-[0.15em]";
const surface = "rounded-2xl border border-[#dce5ed] bg-white shadow-[0_12px_36px_rgba(11,36,60,0.035)]";

export default function PanoramaPortal({ initialData, initialIndicators = [] }: { initialData?: EditorialState; initialIndicators?: MarketIndicator[] }) {
  const { data, loading, error, reload } = usePanoramaContent(initialData);
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [chosenTopic, setChosenTopic] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const readingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setActiveId(new URLSearchParams(window.location.search).get("noticia"));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const days = useMemo(() => publishedDays(data.posts), [data.posts]);
  const day = chosenDay && days.includes(chosenDay) ? chosenDay : days[0] ?? "";
  const topics = useMemo(
    () => groupNewsByTopic(data.posts, day, data.categories),
    [data.posts, data.categories, day],
  );
  const dailyPosts = useMemo(() => topics.flatMap((topic) => topic.posts), [topics]);
  const dailyBriefing = useMemo(() => selectMinuteBriefing(dailyPosts), [dailyPosts]);
  const selected = data.posts.find((post) => post.status === "Publicado" && post.id === activeId) || null;
  const total = dailyPosts.length;
  const visibleTopics = chosenTopic === "all" ? topics : topics.filter((topic) => topic.id === chosenTopic);

  const openPost = (post: EditorialPost) => {
    window.history.pushState(null, "", "/financas?noticia=" + encodeURIComponent(post.id));
    setActiveId(post.id);
    setShareMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closePost = () => {
    if (selected) setChosenDay(selected.publishedAt);
    window.history.pushState(null, "", "/financas");
    setActiveId(null);
    setShareMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sharePost = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: selected?.title || "Panorama 360°", url });
      } catch {
        // O compartilhamento pode ser cancelado pelo visitante.
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage("Link copiado.");
      } catch {
        setShareMessage("Não foi possível copiar o link.");
      }
    }
  };

  const changeDay = (date: string) => {
    setChosenDay(date);
    setChosenTopic(null);
    setExpandedPosts([]);
  };

  const chooseTopic = (id: string) => {
    setChosenTopic(id);
    setExpandedPosts([]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => readingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }));
    });
  };

  const togglePost = (id: string) => {
    setExpandedPosts((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

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

      <MarketThermometerStrip indicators={initialIndicators} />

      <div className="mx-auto max-w-[1230px] px-5 pb-16 pt-9 md:px-8 md:pt-12">
        {loading ? (
          <section role="status" className={surface + " p-10 text-center text-[#58748b]"}>
            Carregando o Panorama 360°…
          </section>
        ) : error ? (
          <section role="alert" className={surface + " p-10 text-center"}>
            <h2 className="text-xl font-bold">Não foi possível carregar o Panorama</h2>
            <p className="mt-3 text-sm text-[#6d8296]">{error}</p>
            <button type="button" onClick={() => void reload()} className="mt-5 rounded-lg bg-[#0b2a45] px-5 py-3 text-sm font-bold text-white">Tentar novamente</button>
          </section>
        ) : selected ? (
          <div className="mx-auto max-w-[940px]">
            <button type="button" onClick={closePost} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#1b5c8a] hover:underline">← Voltar à edição do dia</button>
            <article className={surface + " overflow-hidden"}>
              <div className="border-b border-[#e4eaf0] px-6 py-8 sm:px-10 md:px-14 md:py-12">
                <div className={overline + " flex flex-wrap items-center gap-2 text-[#ab8139]"}>
                  <TopicIcon name={data.categories.find((category) => category.id === selected.categoryId)?.name || ""} size="small" />
                  <span>{data.categories.find((category) => category.id === selected.categoryId)?.name || "Notícia"}</span>
                  <span className="mx-1 text-[#a9b6c2]">•</span>
                  <time dateTime={selected.publishedAt}>{formatEditorialDate(selected.publishedAt)}</time>
                </div>
                <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{selected.title}</h2>
                <p className="mt-5 max-w-[720px] text-base leading-relaxed text-[#62798b] md:text-lg">{selected.summary}</p>
                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-xs text-[#708398]">
                  <span>Panorama 360° • Robson Santiago</span>
                  <button type="button" onClick={sharePost} className="rounded-lg border border-[#cbd9e6] bg-[#f7fafd] px-4 py-2.5 font-semibold text-[#24577e] hover:bg-[#e9f3fa]">Compartilhar notícia ↗</button>
                </div>
                {shareMessage ? <p role="status" className="mt-3 text-sm text-[#256549]">{shareMessage}</p> : null}
              </div>
              <div className="mx-auto max-w-[840px] space-y-5 px-6 py-9 text-base leading-[1.9] text-[#324a5f] sm:px-10 md:px-14 md:py-12">
                {selected.content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
                {selected.showImpact && selected.impact.trim() ? (
                  <section className="mt-9 rounded-xl border-l-4 border-[#d6a751] bg-[#edf4fa] p-5 sm:p-7">
                    <p className={overline + " text-[#9b732f]"}>Por que importa?</p>
                    <p className="mt-3 whitespace-pre-line text-base font-medium leading-relaxed text-[#203b53]">{selected.impact}</p>
                  </section>
                ) : null}
                <p className="border-t border-[#e1e8ee] pt-6 text-xs leading-relaxed text-[#73869a]">Fonte: {selected.source || "Publicação do Panorama 360°"}</p>
              </div>
            </article>
          </div>
        ) : days.length ? (
          <>
            <section aria-label="Edições por data" className={surface + " overflow-hidden p-5 md:p-7"}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={overline + " text-[#a78245]"}>Panorama diário</p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Escolha o dia</h2>
                  <p className="mt-1 text-sm text-[#667f93]">Uma edição por data. Todas as notícias daquele dia reunidas por assunto.</p>
                </div>
                <span className="rounded-full bg-[#ecf2f7] px-3 py-1.5 text-xs font-semibold text-[#507086]">
                  {days.length} {days.length === 1 ? "dia publicado" : "dias publicados"}
                </span>
              </div>
              <div aria-label="Dias com notícias publicadas" className="-mx-1 mt-6 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
                {days.map((date, index) => {
                  const formatted = shortEditionDate(date);
                  const active = day === date;
                  return (
                    <button key={date} type="button" aria-pressed={active} onClick={() => changeDay(date)}
                      className={"flex min-h-[90px] min-w-[106px] snap-start flex-col items-center justify-center rounded-xl border px-4 py-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bf974f] " +
                        (active ? "border-[#0a2b49] bg-[#0a2b49] text-white shadow-md" : "border-[#dce4eb] bg-[#f8fafc] text-[#3a5a74] hover:border-[#9eafbf]")}>
                      <span className={"text-[0.65rem] font-extrabold uppercase tracking-[0.1em] " + (active ? "text-[#eac783]" : "text-[#7890a5]")}>
                        {index === 0 ? "Mais recente" : formatted.weekday}
                      </span>
                      <span className="mt-1 text-2xl font-extrabold leading-none">{formatted.day}</span>
                      <span className="mt-1 text-xs font-semibold uppercase">{formatted.month}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="daily-edition-title" className="mt-9">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={overline + " text-[#b38b45]"}>Edição do dia</p>
                  <h2 id="daily-edition-title" className="mt-2 text-[1.7rem] font-extrabold capitalize leading-tight tracking-tight md:text-4xl">
                    {longEditionDate(day)}
                  </h2>
                  <p className="mt-2 text-sm text-[#6a8093]">{total} {total === 1 ? "notícia" : "notícias"} • {topics.length} {topics.length === 1 ? "assunto" : "assuntos"}</p>
                </div>
                <button type="button" onClick={() => chooseTopic("all")}
                  className="inline-flex min-h-11 items-center rounded-xl border border-[#b4cad9] bg-white px-5 text-sm font-bold text-[#1a527b] transition hover:bg-[#e9f1f8]">
                  Ler a edição completa ↓
                </button>
              </div>
            </section>

            {dailyBriefing ? (
              <section aria-labelledby="minute-briefing-title" className="mt-7 overflow-hidden rounded-2xl border border-[#294d6c] bg-[#0a2b49] text-white shadow-[0_20px_50px_rgba(9,42,70,0.12)]">
                <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
                  <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-9">
                    <p className={overline + " text-[#deb875]"}>Panorama em 60 segundos</p>
                    <h3 id="minute-briefing-title" className="mt-4 text-[1.8rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
                      Tudo que você precisa saber em <span className="text-[#edc77d]">60 segundos</span>
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#b9cedf]">
                      Uma visão rápida desta edição. Clique em qualquer manchete para ler os detalhes.
                    </p>
                  </div>
                  <ol className="divide-y divide-white/[0.12] px-5 py-3 sm:px-8 lg:py-5">
                    {dailyBriefing.items.map((post, index) => (
                      <li key={post.id}>
                        <button type="button" onClick={() => openPost(post)}
                          className="group flex min-h-[64px] w-full items-center gap-4 py-3 text-left focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eac77d]">
                          <span className="w-9 shrink-0 text-xl font-black text-[#e7bd74]">{String(index + 1).padStart(2, "0")}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-snug text-white group-hover:underline sm:text-[0.96rem]">{post.title}</span>
                            <span className="mt-1 block text-[0.7rem] font-medium tracking-wide text-[#adc2d5]">
                              {data.categories.find((category) => category.id === post.categoryId)?.name || "Notícia"}
                            </span>
                          </span>
                          <span aria-hidden="true" className="text-xl text-[#eac77d] transition-transform group-hover:translate-x-1">↗</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            ) : null}

            <section aria-labelledby="topics-title" className="mt-11">
              <div className="mb-5">
                <p className={overline + " text-[#b38b45]"}>Notícias organizadas por assunto</p>
                <h2 id="topics-title" className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">O que você quer acompanhar?</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6d8093]">
                  Escolha Brasil, Mundo ou outro tema para abrir todas as notícias da data selecionada.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topics.map((topic) => (
                  <button key={topic.id} type="button" aria-pressed={chosenTopic === topic.id} onClick={() => chooseTopic(topic.id)}
                    className={"group flex min-h-[230px] flex-col rounded-2xl border p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c3a26b] " +
                      (chosenTopic === topic.id ? "border-[#0d3d62] bg-[#e6f0f7] shadow-[0_10px_25px_rgba(12,42,72,0.09)]" : "border-[#dbe4ed] bg-white")}>
                    <span className="flex items-start justify-between gap-3">
                      <TopicIcon name={topic.name} />
                      <span className="rounded-full bg-[#edf2f7] px-3 py-1 text-xs font-bold text-[#547089]">
                        {topic.posts.length} {topic.posts.length === 1 ? "notícia" : "notícias"}
                      </span>
                    </span>
                    <span className="mt-4 text-xl font-extrabold tracking-tight text-[#0d2f4d]">{topic.name}</span>
                    <span className="mt-3 space-y-2 text-[0.78rem] leading-snug text-[#61788b]">
                      {topic.posts.slice(0, 2).map((post) => (
                        <span key={post.id} className="block border-l-2 border-[#d7bb87] pl-2">{post.title}</span>
                      ))}
                      {topic.posts.length > 2 ? <span className="block text-xs font-medium text-[#3c6c8f]">+ {topic.posts.length - 2} nesta seção</span> : null}
                    </span>
                    <span className="mt-auto pt-5 text-sm font-bold text-[#1d5d88] group-hover:underline">
                      Abrir todas de {topic.name} <span aria-hidden="true">→</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {chosenTopic ? (
              <div ref={readingRef} className="mt-11 scroll-mt-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={overline + " text-[#b38b45]"}>Leitura do dia • {formatEditorialDate(day)}</p>
                    <h2 className="mt-2 text-2xl font-extrabold md:text-3xl">
                      {chosenTopic === "all" ? "Edição completa por assunto" : visibleTopics[0]?.name || "Notícias do dia"}
                    </h2>
                  </div>
                  <button type="button" onClick={() => { setChosenTopic(null); setExpandedPosts([]); }}
                    className="min-h-11 rounded-lg border border-[#cbd8e2] bg-white px-4 text-sm font-bold text-[#315d7d] hover:bg-[#eaf2f8]">
                    Fechar leitura ↑
                  </button>
                </div>

                <div className="space-y-6">
                  {visibleTopics.map((topic) => (
                    <section key={topic.id} aria-label={"Notícias de " + topic.name}
                      className={surface + " overflow-hidden"}>
                      <header className="flex flex-wrap items-center gap-4 border-b border-[#e0e8ef] bg-[#e8f0f6] px-5 py-6 sm:px-8">
                        <TopicIcon name={topic.name} />
                        <div className="flex-1">
                          <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">{topic.name}</h3>
                          <p className="mt-1 text-xs font-semibold text-[#5e7b90]">{topic.posts.length} {topic.posts.length === 1 ? "notícia" : "notícias"} nesta edição</p>
                        </div>
                        <button type="button"
                          onClick={() => setExpandedPosts((current) => {
                            const allOpen = topic.posts.every((post) => current.includes(post.id));
                            const others = current.filter((id) => !topic.posts.some((post) => post.id === id));
                            return allOpen ? others : [...others, ...topic.posts.map((post) => post.id)];
                          })}
                          className="min-h-10 rounded-lg border border-[#b9cddd] bg-white px-3 text-xs font-bold text-[#24597c] hover:bg-[#f5f9fc]">
                          {topic.posts.every((post) => expandedPosts.includes(post.id)) ? "Recolher todas" : "Ler textos completos"}
                        </button>
                      </header>

                      <ol className="divide-y divide-[#e6edf3]">
                        {topic.posts.map((post, index) => {
                          const expanded = expandedPosts.includes(post.id);
                          return (
                            <li key={post.id} className="px-5 py-6 sm:px-8 sm:py-7">
                              <div className="flex items-start gap-4">
                                <span className="w-8 shrink-0 pt-1 text-xl font-extrabold text-[#b38b45]">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <button type="button" aria-expanded={expanded}
                                    onClick={() => togglePost(post.id)}
                                    className="group w-full text-left focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b38b45]">
                                    <span className="flex items-start gap-3">
                                      <span className="min-w-0 flex-1 text-lg font-extrabold leading-snug tracking-tight text-[#102f4b] group-hover:text-[#23658f] sm:text-xl">{post.title}</span>
                                      <span aria-hidden="true" className="shrink-0 text-lg text-[#3e6c8a]">{expanded ? "−" : "+"}</span>
                                    </span>
                                  </button>
                                  {post.summary.trim() && !(expanded && post.content.trimStart().startsWith(post.summary.trim())) ? (
                                    <p className="mt-2 text-sm leading-relaxed text-[#647d90]">{post.summary}</p>
                                  ) : null}
                                  {expanded ? (
                                    <div className="mt-5 space-y-4 text-[0.94rem] leading-[1.85] text-[#314b61]">
                                      {post.content.split(/\n\s*\n/).filter(Boolean).map((paragraph, pIndex) => (
                                        <p key={pIndex} className="whitespace-pre-line">{paragraph}</p>
                                      ))}
                                      {post.showImpact && post.impact.trim() ? (
                                        <div className="rounded-xl border-l-4 border-[#d6aa59] bg-[#eff5f9] p-5">
                                          <p className={overline + " text-[#956d2b]"}>Por que importa?</p>
                                          <p className="mt-2 whitespace-pre-line leading-relaxed text-[#203b53]">{post.impact}</p>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => togglePost(post.id)}
                                      className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-[#21628d] hover:underline">
                                      Ler notícia completa ↓
                                    </button>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                      {uniqueTopicSources(topic.posts).length > 0 ? (
                        <footer className="border-t border-[#e1e8ee] bg-[#f5f8fa] px-5 py-5 sm:px-8">
                          <p className={overline + " text-[#6a8396]"}>Fontes informadas para {topic.name}</p>
                          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#647b8d]">
                            {uniqueTopicSources(topic.posts).map((source) => (
                              <li key={source} className="break-words">{source}</li>
                            ))}
                          </ul>
                        </footer>
                      ) : null}
                    </section>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-[#72879a]">Clique em um assunto para ler todas as notícias reunidas naquele tema.</p>
            )}
          </>
        ) : (
          <section className={surface + " p-8 text-center sm:p-12"}>
            <p className={overline + " text-[#af8645]"}>Panorama 360°</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">Primeiras edições em preparação</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#617b8f]">
              Assim que o Robson publicar as notícias, você poderá escolher a data e navegar por Brasil, Mundo e outros assuntos, com todas as matérias reunidas em cada seção.
            </p>
          </section>
        )}
        <p className="mt-12 text-center text-xs leading-relaxed text-[#8191a1]">
          Panorama 360° — Robson Santiago. Conteúdo informativo, com fontes identificadas nas notícias.
        </p>
      </div>

      <footer className="border-t border-[#dfe7ed] bg-white px-5 py-8 text-center">
        <p className="font-black tracking-tight text-[#0a2d4a]">PANORAMA <span className="text-[#c0954a]">360°</span></p>
        <p className="mt-2 text-xs text-[#718498]">Robson Santiago • A notícia, o contexto e o que realmente importa.</p>
        <Link href="/" className="mt-3 inline-block text-xs font-semibold text-[#1b5b84] hover:underline">Voltar ao site principal →</Link>
      </footer>
    </main>
  );
}
