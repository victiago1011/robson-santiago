"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  formatEditorialDate,
  usePanoramaContent,
  type EditorialPost,
  type EditorialState,
} from "@/lib/panorama/editorial-client";
import { selectMinuteBriefing } from "@/lib/panorama/briefing";

const overline = "text-[0.7rem] font-extrabold uppercase tracking-[0.15em]";
const card = "rounded-2xl border border-[#dbe4ed] bg-white shadow-[0_12px_32px_rgba(11,36,60,0.035)]";

export default function PanoramaPortal({ initialData }: { initialData?: EditorialState }) {
  const { data, loading, error, reload } = usePanoramaContent(initialData);
  const [categoryId, setCategoryId] = useState("todas");
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [limit, setLimit] = useState(9);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveId(params.get("noticia"));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const available = useMemo(
    () => data.posts.filter((post) => post.status === "Publicado"),
    [data.posts],
  );

  const articles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return available
      .filter((post) => {
        const categoryMatches = categoryId === "todas" || post.categoryId === categoryId;
        const dateMatches = !day || post.publishedAt === day;
        const queryMatches = !query || [post.title, post.summary, post.content, post.impact]
          .some((part) => part.toLocaleLowerCase("pt-BR").includes(query));
        return categoryMatches && dateMatches && queryMatches;
      })
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title, "pt-BR"));
  }, [available, categoryId, day, search]);

  const briefing = useMemo(() => selectMinuteBriefing(available), [available]);

  const selected = available.find((post) => post.id === activeId) || null;

  const openPost = (post: EditorialPost) => {
    window.history.pushState(null, "", "/financas?noticia=" + encodeURIComponent(post.id));
    setActiveId(post.id);
    setShareMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closePost = () => {
    window.history.pushState(null, "", "/financas");
    setActiveId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sharePost = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: selected?.title || "Panorama 360°", url });
      } catch {
        // O usuário pode cancelar o diálogo de compartilhamento.
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

  const clearFilters = () => {
    setCategoryId("todas");
    setSearch("");
    setDay("");
    setLimit(9);
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

      <div className="mx-auto max-w-[1230px] px-5 pb-16 pt-9 md:px-8 md:pt-12">
        {loading ? (
          <section role="status" className={card + " p-10 text-center text-[#58748b]"}>Carregando notícias do Panorama 360°…</section>
        ) : error ? (
          <section role="alert" className={card + " p-10 text-center"}>
            <h2 className="text-xl font-bold">Não foi possível carregar as notícias</h2>
            <p className="mt-3 text-sm text-[#6d8296]">{error}</p>
            <button type="button" onClick={() => void reload()} className="mt-5 rounded-lg bg-[#0b2a45] px-5 py-3 text-sm font-bold text-white">Tentar novamente</button>
          </section>
        ) : selected ? (
          <div className="mx-auto max-w-[950px]">
            <button type="button" onClick={closePost} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#1b5c8a] hover:underline">← Todas as notícias</button>
            <article className={card + " overflow-hidden"}>
              <div className="border-b border-[#e4eaf0] px-6 py-8 sm:px-10 md:px-14 md:py-12">
                <p className={overline + " text-[#ab8139]"}>
                  {data.categories.find((cat) => cat.id === selected.categoryId)?.name || "Notícia"}
                  <span className="mx-2 text-[#a9b6c2]">•</span>{formatEditorialDate(selected.publishedAt)}
                </p>
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
                {selected.impact ? (
                  <section className="mt-9 rounded-xl border-l-4 border-[#d6a751] bg-[#edf4fa] p-5 sm:p-7">
                    <p className={overline + " text-[#9b732f]"}>Por que importa?</p>
                    <p className="mt-3 whitespace-pre-line text-base font-medium leading-relaxed text-[#203b53]">{selected.impact}</p>
                  </section>
                ) : null}
                <p className="border-t border-[#e1e8ee] pt-6 text-xs leading-relaxed text-[#73869a]">Fonte: {selected.source || "Publicação do Panorama 360°"}</p>
              </div>
            </article>
          </div>
        ) : (
          <>
            {briefing ? (
              <section aria-labelledby="minute-briefing-title" className="mb-10 overflow-hidden rounded-2xl border border-[#294d6c] bg-[#0a2b49] text-white shadow-[0_20px_50px_rgba(9,42,70,0.12)]">
                <div className="grid lg:grid-cols-[0.84fr_1.16fr]">
                  <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-9">
                    <p className={overline + " text-[#deb875]"}>Panorama rápido • {formatEditorialDate(briefing.date)}</p>
                    <h2 id="minute-briefing-title" className="mt-4 text-[1.8rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
                      Tudo que você precisa saber em <span className="text-[#edc77d]">60 segundos</span>
                    </h2>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#b9cedf]">
                      Os principais assuntos da publicação mais recente. Escolha um destaque para ler a notícia completa.
                    </p>
                  </div>
                  <ol className="divide-y divide-white/[0.12] px-5 py-3 sm:px-8 lg:py-5">
                    {briefing.items.map((post, index) => (
                      <li key={post.id}>
                        <button type="button" onClick={() => openPost(post)} className="group flex min-h-[66px] w-full items-center gap-4 py-3 text-left focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eac77d]">
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
            ) : (
              <section aria-label="Tudo que você precisa saber em 60 segundos" className="mb-10 rounded-2xl border border-[#dce5ec] bg-white px-6 py-7 sm:px-8">
                <p className={overline + " text-[#a68145]"}>Panorama rápido</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#12324e]">Tudo que você precisa saber em 60 segundos</h2>
                <p className="mt-3 max-w-2xl text-sm text-[#667b8d]">Os cinco principais assuntos aparecerão aqui assim que as primeiras notícias forem publicadas.</p>
              </section>
            )}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={overline + " text-[#b38b45]"}>Atualizações e análises</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-[2.5rem]">Últimas notícias</h2>
                <p className="mt-2 text-sm text-[#6a8093]">Escolha os assuntos ou uma data para ler o que mais interessa.</p>
              </div>
              <span className="text-sm font-semibold text-[#597287]">{articles.length} {articles.length === 1 ? "notícia encontrada" : "notícias encontradas"}</span>
            </div>

            <div className="mt-7 grid gap-3 rounded-2xl border border-[#dce5ed] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end md:p-5">
              <label className="block text-xs font-bold text-[#4d657b]">
                Buscar notícias
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(9); }}
                  placeholder="Busque por tema ou palavra-chave"
                  className="mt-2 h-11 w-full rounded-lg border border-[#cad7e2] bg-[#f9fbfd] px-3 text-sm font-normal text-[#183d59] outline-offset-2 placeholder:text-[#8698aa] focus-visible:outline-[#c39954]" />
              </label>
              <label className="block text-xs font-bold text-[#4d657b]">
                Filtrar por data
                <input type="date" value={day} onChange={(event) => { setDay(event.target.value); setLimit(9); }}
                  className="mt-2 h-11 w-full min-w-[190px] rounded-lg border border-[#cad7e2] bg-[#f9fbfd] px-3 text-sm font-normal text-[#183d59] outline-offset-2 focus-visible:outline-[#c39954]" />
              </label>
              <button type="button" onClick={clearFilters} className="h-11 rounded-lg border border-[#cad7e2] px-4 text-sm font-semibold text-[#245a7f] hover:bg-[#eef4f9]">Limpar filtros</button>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-3" aria-label="Categorias de notícias">
              <button type="button" aria-pressed={categoryId === "todas"} onClick={() => { setCategoryId("todas"); setLimit(9); }}
                className={"shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition " + (categoryId === "todas" ? "border-[#092a47] bg-[#092a47] text-white" : "border-[#d2dfe9] bg-white text-[#48667e] hover:border-[#8daabf]")}>Todas</button>
              {data.categories.map((cat) => (
                <button key={cat.id} type="button" aria-pressed={categoryId === cat.id} onClick={() => { setCategoryId(cat.id); setLimit(9); }}
                  className={"shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition " + (categoryId === cat.id ? "border-[#092a47] bg-[#092a47] text-white" : "border-[#d2dfe9] bg-white text-[#48667e] hover:border-[#8daabf]")}>{cat.name}</button>
              ))}
            </div>

            {articles.length ? (
              <>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {articles.slice(0, limit).map((post, index) => (
                    <button key={post.id} type="button" onClick={() => openPost(post)}
                      className={card + " group flex min-h-[260px] flex-col p-6 text-left transition hover:-translate-y-1 hover:border-[#acbfd0] hover:shadow-lg"}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={overline + " text-[#a67c37]"}>{data.categories.find((cat) => cat.id === post.categoryId)?.name || "Notícia"}</span>
                        <time className="text-xs font-semibold text-[#7d8fa1]" dateTime={post.publishedAt}>{formatEditorialDate(post.publishedAt)}</time>
                      </div>
                      <h3 className="mt-5 text-[1.3rem] font-extrabold leading-snug tracking-tight group-hover:text-[#1e638f]">{post.title}</h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#657b8e]">{post.summary}</p>
                      <span className="mt-auto pt-7 text-sm font-bold text-[#1e608c]">Ler notícia <span aria-hidden="true">↗</span></span>
                    </button>
                  ))}
                </div>
                {articles.length > limit ? (
                  <div className="mt-8 text-center">
                    <button type="button" onClick={() => setLimit(limit + 9)} className="rounded-xl border border-[#b9cddd] bg-white px-6 py-3 text-sm font-bold text-[#245c84] hover:bg-[#eaf2f9]">Mostrar mais notícias</button>
                  </div>
                ) : null}
              </>
            ) : (
              <section className={card + " mt-6 px-6 py-14 text-center"}>
                <h3 className="text-xl font-bold">{available.length ? "Nenhuma notícia encontrada" : "Primeiras publicações em preparação"}</h3>
                <p className="mt-2 text-sm text-[#637a8e]">{available.length ? "Altere a busca, a categoria ou a data selecionada." : "Em breve, as notícias e análises do Panorama 360° estarão disponíveis aqui."}</p>
                {available.length ? <button type="button" onClick={clearFilters} className="mt-5 text-sm font-semibold text-[#1d5c88] underline">Mostrar todas as notícias</button> : null}
              </section>
            )}
          </>
        )}
        <p className="mt-12 text-center text-xs leading-relaxed text-[#8191a1]">Panorama 360° — Robson Santiago. Conteúdo informativo, com fontes identificadas em cada notícia.</p>
      </div>
      <footer className="border-t border-[#dfe7ed] bg-white px-5 py-8 text-center">
        <p className="font-black tracking-tight text-[#0a2d4a]">PANORAMA <span className="text-[#c0954a]">360°</span></p>
        <p className="mt-2 text-xs text-[#718498]">Robson Santiago • A notícia, o contexto e o que realmente importa.</p>
        <Link href="/" className="mt-3 inline-block text-xs font-semibold text-[#1b5b84] hover:underline">Voltar ao site principal →</Link>
      </footer>
    </main>
  );
}
