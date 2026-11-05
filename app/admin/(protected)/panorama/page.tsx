"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { panoramaEdition, panoramaNews } from "@/lib/panorama/demo";

type Tab = "resumo" | "nova" | "documentos";

export default function PanoramaAdminPreview() {
  const [tab, setTab] = useState<Tab>("resumo");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [article, setArticle] = useState("");
  const [impact, setImpact] = useState("");
  const [category, setCategory] = useState("Brasil");
  const [saved, setSaved] = useState(false);

  const simulateSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.67rem] font-bold uppercase tracking-[0.18em] text-[#9e782f]">Gestão editorial • Novo módulo</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0b2a45] md:text-4xl">Panorama 360°</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#566a7b]">Organize edições, notícias, análises e documentos em um único lugar.</p>
        </div>
        <Link href="/financas" className="inline-flex min-h-11 items-center rounded-xl bg-[#0c304e] px-5 text-sm font-semibold text-white hover:bg-[#174969]">Visualizar portal ↗</Link>
      </div>

      <div role="note" className="rounded-xl border border-[#e4c983] bg-[#fff8e5] p-4 text-sm leading-relaxed text-[#6d5424]">
        <strong>Protótipo, sem integração.</strong> Os dados desta tela são apenas demonstração. As ações abaixo não alteram o Supabase, não publicam notícias e não enviam arquivos. Um rascunho simulado fica somente nesta aba, sem persistência.
      </div>

      <nav aria-label="Módulos do Panorama" className="flex gap-2 overflow-x-auto border-b border-[#d9dedf] pb-3">
        {([
          ["resumo", "Visão editorial"],
          ["nova", "Nova publicação"],
          ["documentos", "Biblioteca & clipping"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={"shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold " + (tab === id ? "bg-[#0b2a45] text-white" : "bg-white text-[#526576] hover:bg-[#ecf0f3]")}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "resumo" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Edições demonstrativas", "01"],
              ["Notícias do exemplo", String(panoramaNews.length).padStart(2, "0")],
              ["PDFs cadastrados", "00"],
              ["Publicações reais", "00"],
            ].map(([label, value], index) => (
              <div key={label} className={"rounded-xl border p-5 " + (index === 0 ? "border-[#0d334d] bg-[#0b2a45] text-white" : "border-[#e2e6e7] bg-white text-[#142b3d]")}>
                <p className={"text-[0.65rem] font-semibold uppercase tracking-[0.12em] " + (index === 0 ? "text-white/70" : "text-[#627689]")}>{label}</p>
                <p className="mt-3 text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_290px]">
            <section className="rounded-xl border border-[#e2e6e7] bg-white p-5 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[#9e782f]">Exemplo de edição</p>
                  <h2 className="mt-2 text-xl font-bold">Panorama nº {panoramaEdition.number}</h2>
                  <p className="mt-1 text-sm text-[#64778a]">{panoramaEdition.date} · {panoramaNews.length} matérias no protótipo</p>
                </div>
                <span className="rounded-full bg-[#edf2f7] px-3 py-1 text-xs font-bold text-[#516779]">Não publicado</span>
              </div>
              <div className="mt-5 divide-y divide-[#eef1f2]">
                {panoramaNews.slice(0, 5).map((news, index) => (
                  <div key={news.slug} className="flex items-start gap-3 py-3">
                    <span className="min-w-7 text-xs font-bold text-[#ad863f]">{String(index + 1).padStart(2, "0")}</span>
                    <div><p className="text-sm font-semibold">{news.title}</p><p className="mt-1 text-xs text-[#718395]">{news.category}</p></div>
                  </div>
                ))}
              </div>
            </section>
            <aside className="rounded-xl bg-[#0b2a45] p-6 text-white">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[#d7af64]">Ações rápidas</p>
              <h2 className="mt-3 text-xl font-bold">Prepare a próxima edição</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">Experimente o editor e veja como será a publicação de um comentário diário.</p>
              <button type="button" onClick={() => setTab("nova")} className="mt-6 w-full rounded-lg bg-[#e0b96e] px-4 py-3 text-sm font-bold text-[#10273c] hover:bg-[#f0c980]">Criar publicação →</button>
              <button type="button" onClick={() => setTab("documentos")} className="mt-3 w-full rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold hover:bg-white/10">Gerenciar documentos</button>
            </aside>
          </div>
        </>
      ) : tab === "nova" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <form onSubmit={simulateSave} className="space-y-5 rounded-xl border border-[#e2e6e7] bg-white p-5 md:p-7">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a47d36]">Editor de demonstração</p>
              <h2 className="mt-2 text-2xl font-bold">Nova publicação rápida</h2>
              <p className="mt-2 text-xs text-[#60778a]">Campos fictícios — nenhum conteúdo será gravado.</p>
            </div>
            <label className="block text-sm font-semibold">Título
              <input value={title} required onChange={(e) => { setTitle(e.target.value); setSaved(false); }} placeholder="Ex.: O que observar no cenário econômico" className="mt-2 w-full rounded-lg border border-[#cbd6de] px-4 py-3 text-base font-normal outline-offset-2 focus-visible:outline-[#296b91]" />
            </label>
            <label className="block text-sm font-semibold">Categoria
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-lg border border-[#cbd6de] bg-white px-4 py-3 text-base font-normal">
                {["Brasil", "Mundo", "Economia & Mercados", "Política", "Negócios", "Santa Catarina"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Resumo
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Resumo para aparecer na capa..." className="mt-2 w-full rounded-lg border border-[#cbd6de] px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Texto principal
              <textarea value={article} onChange={(e) => setArticle(e.target.value)} rows={6} placeholder="Escreva o conteúdo da notícia ou comentário..." className="mt-2 w-full rounded-lg border border-[#cbd6de] px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Por que importa?
              <textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={3} placeholder="Qual o impacto para o leitor?" className="mt-2 w-full rounded-lg border border-[#cbd6de] px-4 py-3 font-normal" />
            </label>
            <button type="submit" className="rounded-lg bg-[#0b2a45] px-5 py-3 text-sm font-semibold text-white hover:bg-[#174969]">Simular salvamento de rascunho</button>
            {saved ? <p role="status" className="rounded-lg bg-[#edf7f0] p-3 text-sm font-semibold text-[#2b7147]">Rascunho simulado nesta aba. Nada foi salvo no banco e nenhuma publicação foi realizada.</p> : null}
          </form>
          <aside className="self-start rounded-xl border border-[#e2e6e7] bg-white p-6 lg:sticky lg:top-6">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a47d36]">Pré-visualização</p>
            <p className="mt-4 text-xs font-bold text-[#70839a]">{category}</p>
            <h3 className="mt-2 text-xl font-bold leading-snug">{title || "O título da publicação aparece aqui"}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#61758a]">{summary || "O resumo aparecerá aqui conforme você digita."}</p>
            {article ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{article}</p> : null}
            {impact ? <div className="mt-5 rounded-lg border-l-4 border-[#ddb561] bg-[#eff5f9] p-4"><p className="text-xs font-bold uppercase text-[#95691c]">Por que importa?</p><p className="mt-2 text-sm">{impact}</p></div> : null}
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-xl border border-[#e2e6e7] bg-white p-7">
            <p className="text-3xl" aria-hidden="true">↗</p><h2 className="mt-3 text-2xl font-bold">Clipping de 7 dias</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5c7184]">Cadastro futuro de links oficiais, fontes, comentários e prazo para remoção dos destaques. Sem republicação de jornais inteiros.</p>
            <p className="mt-6 rounded-lg bg-[#f2f5f8] p-4 text-sm text-[#516a7b]">Funcionalidade visual prevista. Nenhum link foi registrado.</p>
          </section>
          <section className="rounded-xl border border-[#e2e6e7] bg-white p-7">
            <p className="text-3xl" aria-hidden="true">▤</p><h2 className="mt-3 text-2xl font-bold">Documentos em PDF</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#5c7184]">Upload futuro de PDFs próprios ou autorizados, com opção de permanência ou validade de 7 dias.</p>
            <div className="mt-6 rounded-xl border-2 border-dashed border-[#c7d2dc] bg-[#f8fafc] p-6 text-center text-sm text-[#607689]" role="note">Upload desativado no protótipo<br />Nenhum arquivo é enviado</div>
          </section>
        </div>
      )}
      <p className="border-t border-[#d7dedf] pt-5 text-xs leading-relaxed text-[#667a8c]">Próxima etapa, após aprovação do visual: persistência em Supabase, autenticação administrativa, revisão editorial, publicação agendada e limpeza segura de documentos temporários.</p>
    </div>
  );
}
