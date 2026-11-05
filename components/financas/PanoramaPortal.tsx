"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  marketSnapshot,
  panoramaAgenda,
  panoramaCategories,
  panoramaEdition,
  panoramaHistory,
  panoramaNews,
  type PanoramaNews,
} from "@/lib/panorama/demo";

const badge = "text-[0.65rem] font-bold uppercase tracking-[0.16em]";
const panel = "rounded-2xl border border-[#dce5ed] bg-white shadow-[0_12px_36px_rgba(14,39,65,0.035)]";

export default function PanoramaPortal() {
  const [category, setCategory] = useState<string>("Todas");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<PanoramaNews | null>(null);
  const [indicator, setIndicator] = useState<string | null>(null);
  const [view, setView] = useState<"inicio" | "agenda" | "biblioteca" | "edicoes">("inicio");

  const visibleNews = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    return panoramaNews.filter((news) => {
      const matchesCategory = category === "Todas" || news.category === category
        || (category === "Brasil" && ["Economia & Mercados", "Política"].includes(news.category));
      const matchesQuery = !search || [news.title, news.category, news.description, news.impact]
        .some((part) => part.toLocaleLowerCase("pt-BR").includes(search));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const showView = (next: "inicio" | "agenda" | "biblioteca" | "edicoes") => {
    setView(next);
    setOpened(null);
    setCategory("Todas");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openArticle = (article: PanoramaNews) => {
    setOpened(article);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: opened?.title || "Panorama 360°", url: window.location.href });
      } catch { /* Compartilhamento cancelado pelo visitante. */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      window.alert("Link da prévia copiado.");
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-[#142a42]">
      <div className="border-b border-[#d9e3ed] bg-[#fff]">
        <div className="mx-auto flex max-w-[1250px] flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-[#60748a] md:px-8">
          <p className="font-semibold uppercase tracking-[0.18em]">Robson Santiago / Finanças</p>
          <span className="rounded-full bg-[#fff5d9] px-3 py-1.5 text-[0.68rem] font-semibold text-[#765215]">Prévia editorial • conteúdo sujeito à revisão</span>
        </div>
      </div>

      <section className="overflow-hidden bg-[#071b33] text-white" aria-label="Apresentação Panorama 360 graus">
        <div className="relative mx-auto grid max-w-[1250px] gap-10 px-5 py-12 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-16">
          <div className="pointer-events-none absolute -right-36 -top-28 h-80 w-80 rounded-full border border-[#b8934c]/40 opacity-60 md:h-[33rem] md:w-[33rem]" aria-hidden="true" />
          <div className="pointer-events-none absolute right-0 top-5 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_45%_50%,#12509a_0%,#0e2b50_38%,transparent_72%)] opacity-60 md:h-[35rem] md:w-[35rem]" aria-hidden="true" />
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-9 bg-[#d5ac57]" />
              <span className={badge + " text-[#e5c27a]"}>Brasil • Mundo • Economia & Política</span>
            </div>
            <h1 className="font-sans text-[3.1rem] font-black leading-[0.98] tracking-[-0.06em] sm:text-[4.7rem] lg:text-[5.8rem]">
              PANORAMA <span className="text-[#e1b863]">360°</span>
            </h1>
            <p className="mt-5 max-w-xl text-xl font-medium leading-snug text-white/90 md:text-2xl">A notícia, o contexto e o que realmente importa.</p>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-[#bacbdd]">Uma leitura direta dos acontecimentos que movimentam a economia, os negócios e a sociedade — com o olhar de Robson Santiago.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full border border-white/25 px-4 py-2 font-semibold">Edição nº {panoramaEdition.number}</span>
              <span className="text-white/70">{panoramaEdition.date}</span>
            </div>
          </div>
          <aside className="relative self-center rounded-2xl border border-white/20 bg-white/[0.08] p-6 backdrop-blur-sm md:p-7">
            <p className={badge + " text-[#e5c27a]"}>Panorama em 5 minutos</p>
            <h2 className="mt-3 text-2xl font-bold leading-tight">O essencial do dia, sem perder o contexto.</h2>
            <div className="mt-5 divide-y divide-white/15">
              {panoramaNews.slice(0, 3).map((news, index) => (
                <button key={news.slug} type="button" onClick={() => openArticle(news)} className="group flex w-full items-start gap-4 py-3 text-left">
                  <span className="text-xl font-black text-[#d8af62]">0{index + 1}</span>
                  <span className="flex-1 text-sm font-medium leading-snug group-hover:underline">{news.title}</span>
                  <span aria-hidden="true" className="text-[#e3bc6b]">↗</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#b8c7d8]">Seleção demonstrativa baseada no material enviado.</p>
          </aside>
        </div>
      </section>

      <section aria-label="Termômetro econômico" className="border-b border-[#dce5ed] bg-white">
        <div className="mx-auto max-w-[1250px] px-5 py-5 md:px-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className={badge + " text-[#526b82]"}>Termômetro econômico</h2>
            <p className="text-[0.68rem] text-[#6a7d8d]">Valores informados na edição • referência {panoramaEdition.marketReference} • não verificados</p>
          </div>
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-6 md:gap-2 md:px-0">
            {marketSnapshot.map((item) => (
              <button key={item.label} type="button" onClick={() => setIndicator(indicator === item.label ? null : item.label)}
                aria-expanded={indicator === item.label}
                className="min-w-[145px] flex-1 snap-start rounded-xl border border-[#e6ebf0] px-4 py-3 text-left transition hover:border-[#b6c9d8] focus-visible:outline-2 focus-visible:outline-[#d5a547]">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#60748a]">{item.label}</span>
                <span className="mt-1 block text-lg font-extrabold tracking-tight">{item.value}</span>
                <span className={"mt-1 block text-xs font-bold " + (item.positive === null ? "text-[#738191]" : item.positive ? "text-[#18754f]" : "text-[#a73434]")}>{item.change}</span>
              </button>
            ))}
          </div>
          {indicator ? <p role="status" className="mt-3 rounded-lg bg-[#eaf2f8] p-3 text-sm"><strong>{indicator}:</strong> {marketSnapshot.find((x) => x.label === indicator)?.description} Dados de demonstração, não são cotações ao vivo.</p> : null}
        </div>
      </section>

      <nav aria-label="Navegação do panorama" className="sticky top-0 z-10 border-b border-[#dce5ed] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1250px] gap-2 overflow-x-auto px-5 py-3 md:px-8">
          {([
            ["inicio", "Notícias"],
            ["agenda", "Agenda"],
            ["biblioteca", "Biblioteca & clipping"],
            ["edicoes", "Edições anteriores"],
          ] as const).map(([id, name]) => (
            <button key={id} type="button" onClick={() => showView(id)}
              className={"shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition " + (view === id ? "bg-[#082947] text-white" : "text-[#436079] hover:bg-[#eaf0f5]")}>{name}</button>
          ))}
        </div>
      </nav>

      {opened ? (
        <div className="mx-auto max-w-[1040px] px-5 py-10 md:px-8 md:py-14">
          <button type="button" onClick={() => setOpened(null)} className="text-sm font-semibold text-[#1c557d] hover:underline">← Voltar às notícias</button>
          <article className="mt-7 rounded-2xl border border-[#dce5ed] bg-white p-6 md:p-12">
            <span className={badge + " text-[#b18330]"}>{opened.category} • Edição {panoramaEdition.number}</span>
            <h2 className="mt-4 max-w-3xl font-display text-3xl leading-tight md:text-5xl">{opened.title}</h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#557086]">{opened.description}</p>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-y border-[#e3e9ee] py-4 text-xs text-[#687c90]">
              <span>Robson Santiago • {panoramaEdition.date}</span>
              <button type="button" onClick={share} className="rounded-lg border border-[#b9cada] px-3 py-2 font-semibold text-[#214560] hover:bg-[#eef4f9]">Compartilhar ↗</button>
            </div>
            <div className="mx-auto mt-9 max-w-[740px] space-y-5 text-base leading-[1.9] text-[#283d50] md:text-lg">
              {opened.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <section className="mt-9 rounded-xl border-l-4 border-[#d6a752] bg-[#eef5fa] p-6">
                <p className={badge + " text-[#896020]"}>Por que importa?</p>
                <p className="mt-3 text-lg font-medium leading-relaxed">{opened.impact}</p>
              </section>
              <p className="border-t border-[#dce5ed] pt-5 text-sm text-[#688097]">Fonte de referência: {opened.source}. Revisar e confirmar as informações antes de publicar.</p>
            </div>
          </article>
          <h3 className="mt-10 text-xl font-bold">Continue acompanhando</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {panoramaNews.filter((news) => news.slug !== opened.slug).slice(0, 2).map((news) => (
              <button key={news.slug} type="button" onClick={() => openArticle(news)} className={panel + " p-5 text-left hover:border-[#bdcddd]"}>
                <span className={badge + " text-[#b18330]"}>{news.category}</span>
                <span className="mt-2 block text-lg font-bold">{news.title} →</span>
              </button>
            ))}
          </div>
        </div>
      ) : view === "inicio" ? (
        <div className="mx-auto max-w-[1250px] px-5 py-10 md:px-8 md:py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className={badge + " text-[#bd944d]"}>Edição 003 • O que está em pauta</p><h2 className="mt-2 font-display text-3xl md:text-4xl">Notícias e análises</h2></div>
            <label className="flex w-full items-center rounded-xl border border-[#cbd8e3] bg-white px-4 py-2 sm:w-[290px]">
              <span className="sr-only">Pesquisar notícias</span>
              <span aria-hidden="true" className="mr-2 text-[#64798a]">⌕</span>
              <input aria-label="Pesquisar notícias" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar assuntos..." className="w-full bg-transparent text-sm outline-none placeholder:text-[#8d9cab]" />
            </label>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-3" aria-label="Filtrar por assunto">
            {panoramaCategories.map((name) => <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}
              className={"shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition " + (category === name ? "border-[#082947] bg-[#082947] text-white" : "border-[#d2dee8] bg-white text-[#496176] hover:border-[#91a9bd]")}>{name}</button>)}
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section aria-label="Notícias selecionadas">
              {visibleNews.length ? <div className="grid gap-4 sm:grid-cols-2">
                {visibleNews.map((news, index) => (
                  <button key={news.slug} type="button" onClick={() => openArticle(news)}
                    className={panel + " group flex min-h-[260px] flex-col p-6 text-left transition hover:-translate-y-0.5 hover:border-[#adc0d1] hover:shadow-lg " + (index === 0 && category === "Todas" && !query ? "sm:col-span-2 sm:min-h-[260px] sm:bg-[#e7f0f8]" : "")}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={badge + " text-[#a77b32]"}>{news.category}</span>
                      <span className="text-xs text-[#8295a6]">05/11/2026</span>
                    </div>
                    <h3 className={"mt-5 font-bold leading-tight tracking-tight group-hover:text-[#1c628d] " + (index === 0 && category === "Todas" && !query ? "text-2xl md:text-3xl" : "text-xl")}>{news.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#5a7083]">{news.description}</p>
                    <span className="mt-auto pt-6 text-sm font-bold text-[#215e8a]">Entenda o que aconteceu <span aria-hidden="true">↗</span></span>
                  </button>
                ))}
              </div> : <div className={panel + " p-10 text-center"}><h3 className="text-xl font-bold">Nenhuma notícia encontrada</h3><p className="mt-2 text-sm text-[#698095]">Tente outra palavra ou escolha uma categoria diferente.</p></div>}
            </section>
            <aside className="space-y-5">
              <div className="overflow-hidden rounded-2xl bg-[#082947] text-white">
                <div className="h-40 bg-cover bg-[position:center_30%] opacity-90" role="img" aria-label="Fotografia de Robson Santiago" style={{ backgroundImage: "linear-gradient(0deg, #082947, transparent 90%), url('/images/robson/robson-hero.png')" }} />
                <div className="p-6">
                  <p className={badge + " text-[#dfb969]"}>A visão do comentarista</p>
                  <h3 className="mt-3 font-display text-2xl leading-snug">A confiança é um dos maiores patrimônios de uma economia.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#bbcedd]">Uma reflexão sobre instituições, riscos e decisões em um mundo em transformação.</p>
                  <button type="button" onClick={() => showView("edicoes")} className="mt-5 text-sm font-semibold text-[#f1cf84] hover:underline">Explorar a edição completa ↗</button>
                </div>
              </div>
              <div className={panel + " p-6"}>
                <p className={badge + " text-[#a77b32]"}>No radar</p>
                <h3 className="mt-2 text-xl font-bold">Próximos acontecimentos</h3>
                <div className="mt-4 space-y-4">
                  {panoramaAgenda.map((event) => <div key={event.date} className="flex gap-3 border-t border-[#edf1f5] pt-4"><span className="min-w-12 text-xs font-bold text-[#996d22]">{event.date}</span><p className="text-sm font-medium">{event.title}</p></div>)}
                </div>
                <button type="button" onClick={() => showView("agenda")} className="mt-5 text-sm font-bold text-[#1c628d]">Ver agenda →</button>
              </div>
              <div className={panel + " p-6"}>
                <p className={badge + " text-[#a77b32]"}>Biblioteca & clipping</p>
                <h3 className="mt-2 text-xl font-bold">Leituras selecionadas</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64798b]">Documentos autorizados, análises próprias e links para conteúdos de terceiros.</p>
                <button type="button" onClick={() => showView("biblioteca")} className="mt-5 text-sm font-bold text-[#1c628d]">Acessar biblioteca →</button>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1250px] px-5 py-12 md:px-8 md:py-16">
          <button type="button" onClick={() => showView("inicio")} className="text-sm font-semibold text-[#1c628d]">← Voltar ao panorama</button>
          {view === "agenda" ? <>
            <p className={badge + " mt-8 text-[#a77b32]"}>Acompanhe as próximas pautas</p><h2 className="mt-2 font-display text-4xl">No radar</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">{panoramaAgenda.map((item) => <div key={item.date} className={panel + " p-6"}><span className={badge + " text-[#af873f]"}>{item.date}</span><h3 className="mt-4 text-xl font-bold">{item.title}</h3><p className="mt-2 text-sm text-[#5b7487]">{item.subtitle}</p></div>)}</div>
            <p className="mt-6 text-sm text-[#6b8094]">Agenda de demonstração. Verifique datas e eventos antes da publicação.</p>
          </> : view === "biblioteca" ? <>
            <p className={badge + " mt-8 text-[#a77b32]"}>Conteúdo selecionado</p><h2 className="mt-2 font-display text-4xl">Biblioteca & clipping</h2>
            <p className="mt-4 max-w-2xl text-[#5d7285]">Relatórios próprios, publicações autorizadas e links para notícias de veículos especializados.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className={panel + " p-7"}><span className="text-3xl" aria-hidden="true">↗</span><h3 className="mt-4 text-2xl font-bold">Clipping • últimos 7 dias</h3><p className="mt-3 text-sm leading-relaxed text-[#60778b]">Aqui aparecerão referências e links oficiais das notícias selecionadas pelo Robson. Nenhuma reprodução integral de jornais de terceiros.</p><p className="mt-6 rounded-lg bg-[#f1f5f9] p-3 text-xs text-[#597086]">Nenhum link cadastrado nesta demonstração.</p></div>
              <div className={panel + " p-7"}><span className="text-3xl" aria-hidden="true">▤</span><h3 className="mt-4 text-2xl font-bold">Relatórios e materiais</h3><p className="mt-3 text-sm leading-relaxed text-[#60778b]">PDFs próprios ou com autorização de redistribuição, com opção de prazo de disponibilidade e descarte seguro.</p><p className="mt-6 rounded-lg bg-[#f1f5f9] p-3 text-xs text-[#597086]">Nenhum PDF foi publicado ou armazenado.</p></div>
            </div>
          </> : <>
            <p className={badge + " mt-8 text-[#a77b32]"}>Arquivo editorial</p><h2 className="mt-2 font-display text-4xl">Edições do Panorama 360°</h2>
            <div className={panel + " mt-8 p-7"}><p className={badge + " text-[#a77b32]"}>Edição nº 003 • {panoramaEdition.date}</p><h3 className="mt-3 text-2xl font-bold">{panoramaEdition.headline}</h3><p className="mt-3 text-sm text-[#5c7388]">Conteúdo demonstrativo baseado na edição enviada. Os fatos precisam de revisão editorial antes da publicação.</p><button type="button" onClick={() => showView("inicio")} className="mt-5 text-sm font-bold text-[#1c628d]">Ler notícias desta edição →</button></div>
            <section className="mt-9"><h3 className="text-xl font-bold">História e memória • 5 de novembro</h3><div className="mt-4 grid gap-3 md:grid-cols-3">{panoramaHistory.map((item) => <div key={item.year} className={panel + " p-5"}><span className="text-2xl font-black text-[#ba8a40]">{item.year}</span><p className="mt-2 text-sm text-[#5e7387]">{item.event}</p></div>)}</div></section>
            <section className="mt-9 rounded-2xl bg-[#082947] p-7 text-white md:p-10"><p className={badge + " text-[#e5bd73]"}>A visão do comentarista</p><h3 className="mt-4 font-display text-3xl">Prudência é compreender o terreno antes de avançar.</h3><p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#d2dfeb]">Ao longo de diferentes ciclos de mercado, confiança e previsibilidade seguem sendo essenciais. Uma boa decisão considera não apenas as oportunidades, mas também os riscos que estaremos preparados para enfrentar.</p><p className="mt-5 text-xs text-[#c5d3df]">Texto adaptado para demonstração. A versão integral depende de revisão e aprovação do Robson.</p></section>
          </>}
        </div>
      )}
      <footer className="border-t border-[#d9e2eb] bg-white px-5 py-9 text-center">
        <p className="text-lg font-black tracking-[-0.03em] text-[#082947]">PANORAMA <span className="text-[#bb914b]">360°</span></p>
        <p className="mt-2 text-xs text-[#64798b]">Robson Santiago • A notícia, o contexto e o que realmente importa.</p>
        <Link href="/" className="mt-4 inline-block text-xs font-bold text-[#1d5d88] hover:underline">Voltar ao site de Robson Santiago →</Link>
      </footer>
    </main>
  );
}
