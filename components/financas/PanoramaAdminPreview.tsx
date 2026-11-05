"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  formatEditorialDate,
  parsePanoramaText,
  uniqueCategoryName,
  usePanoramaContent,
  type EditorialPost,
} from "@/lib/panorama/editorial-client";

type View = "visao" | "importar" | "publicacoes" | "categorias";
type ImportDraft = EditorialPost & { selected: boolean };
const overline = "text-[0.7rem] font-bold uppercase tracking-[0.15em]";
const panel = "rounded-2xl border border-[#dfe6eb] bg-white shadow-[0_8px_24px_rgba(7,28,48,0.035)]";
const field = "mt-1.5 w-full rounded-lg border border-[#cbd7e1] bg-white px-3 py-2.5 text-sm text-[#19364d] outline-offset-2 focus-visible:outline-[#b98a3e]";
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a45] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a4d71]";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cbd8e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#315d7d] hover:bg-[#eff4f8]";
function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

const exampleText = [
  "🇧🇷 BRASIL — ECONOMIA E POLÍTICA",
  "1. Banco Central e o cenário de juros",
  "O Banco Central permanece no centro das discussões sobre crédito, inflação e atividade econômica.",
  "POR QUE IMPORTA?",
  "As decisões de juros influenciam o custo do crédito para famílias e empresas.",
  "",
  "2. Planejamento financeiro ganha importância",
  "O ambiente econômico exige disciplina e atenção aos fluxos de caixa.",
  "POR QUE IMPORTA?",
  "Planejamento e previsibilidade ajudam a lidar com cenários incertos.",
  "",
  "🌎 MUNDO — GEOPOLÍTICA E MERCADOS",
  "3. Mercados internacionais acompanham o cenário político",
  "Mudanças políticas e econômicas podem alterar expectativas sobre comércio e investimentos.",
  "POR QUE IMPORTA?",
  "Acompanhamento de riscos internacionais ajuda a contextualizar decisões locais.",
].join("\n");

function newPost(categoryId: string): EditorialPost {
  return {
    id: crypto.randomUUID(),
    title: "",
    categoryId,
    summary: "",
    content: "",
    impact: "",
    publishedAt: todayInBrazil(),
    status: "Rascunho",
    source: "Texto próprio de Robson Santiago",
  };
}

function FormFields({
  value, onChange, categories,
}: {
  value: EditorialPost;
  onChange: (value: EditorialPost) => void;
  categories: { id: string; name: string }[];
}) {
  const update = (patch: Partial<EditorialPost>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4">
      <label className="block text-sm font-semibold">Título da notícia
        <input required value={value.title} onChange={(e) => update({ title: e.target.value })} className={field} placeholder="Título que aparece no portal" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Categoria
          <select className={field} value={value.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Data da publicação
          <input required type="date" className={field} value={value.publishedAt} onChange={(e) => update({ publishedAt: e.target.value })} />
        </label>
      </div>
      <label className="block text-sm font-semibold">Resumo para o card
        <textarea className={field} rows={2} value={value.summary} onChange={(e) => update({ summary: e.target.value })} placeholder="Uma ou duas frases para atrair a leitura" />
      </label>
      <label className="block text-sm font-semibold">Texto completo
        <textarea required className={field} rows={6} value={value.content} onChange={(e) => update({ content: e.target.value })} placeholder="Escreva a análise, com parágrafos separados por uma linha..." />
      </label>
      <label className="block text-sm font-semibold">Por que importa?
        <textarea className={field} rows={3} value={value.impact} onChange={(e) => update({ impact: e.target.value })} placeholder="Qual o impacto desta notícia para o leitor?" />
      </label>
      <label className="block text-sm font-semibold">Fonte ou referência
        <input className={field} value={value.source} onChange={(e) => update({ source: e.target.value })} placeholder="Link ou identificação da fonte" />
      </label>
      <label className="block text-sm font-semibold">Status
        <select className={field} value={value.status} onChange={(e) => update({ status: e.target.value as EditorialPost["status"] })}>
          <option value="Rascunho">Rascunho</option>
          <option value="Publicado">Publicado (somente na prévia)</option>
        </select>
      </label>
    </div>
  );
}

export default function PanoramaAdminPreview() {
  const { data, save, loading, busy, error, reload, mode } = usePanoramaContent();
  const [view, setView] = useState<View>("visao");
  const [rawText, setRawText] = useState("");
  const [importDate, setImportDate] = useState(todayInBrazil);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<EditorialPost | null>(null);
  const [addingCategory, setAddingCategory] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [postQuery, setPostQuery] = useState("");
  const [postStatus, setPostStatus] = useState("Todos");

  const published = data.posts.filter((post) => post.status === "Publicado").length;
  const draftCount = data.posts.length - published;
  const recentPosts = [...data.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5);
  const shownPosts = useMemo(() => data.posts.filter((post) => (
    (postStatus === "Todos" || post.status === postStatus)
    && [post.title, post.summary].some((part) => part.toLocaleLowerCase("pt-BR").includes(postQuery.trim().toLocaleLowerCase("pt-BR")))
  )).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [data.posts, postQuery, postStatus]);

  function goTo(next: View) {
    setView(next);
    setNotice("");
    setEditing(null);
  }

  function analyzeImport() {
    const output = parsePanoramaText(rawText, importDate, data.categories);
    setDrafts(output.map((post) => ({ ...post, selected: true })));
    setNotice(output.length
      ? output.length + " notícia(s) identificada(s). Confira títulos, textos, categorias e fatos antes de salvar."
      : "Não encontrei notícias numeradas. Use títulos como '1. Título da notícia', separados por linhas.");
  }

  function updateDraft(id: string, next: EditorialPost) {
    setDrafts((prev) => prev.map((draft) => draft.id === id ? { ...next, selected: draft.selected } : draft));
  }

  async function persist(next: typeof data): Promise<boolean> {
    try {
      await save(next);
      return true;
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Falha ao salvar. Confira a conexão.");
      return false;
    }
  }

  async function commitImport(status: EditorialPost["status"]) {
    const chosen = drafts.filter((draft) => draft.selected && draft.title.trim() && draft.content.trim());
    if (!chosen.length) {
      setNotice("Selecione ao menos uma notícia com título e texto para continuar.");
      return;
    }
    const posts = chosen.map(({ selected: _selected, ...post }) => ({ ...post, status }));
    if (!await persist({ ...data, posts: [...posts, ...data.posts] })) return;
    setDrafts([]);
    setRawText("");
    setNotice(posts.length + (status === "Publicado" ? " notícia(s) publicada(s)." : " rascunho(s) salvo(s)."));
    setView("publicacoes");
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editing.title.trim() || !editing.content.trim()) return;
    const exists = data.posts.some((post) => post.id === editing.id);
    if (!await persist({
      ...data,
      posts: exists ? data.posts.map((post) => post.id === editing.id ? editing : post) : [editing, ...data.posts],
    })) return;
    setEditing(null);
    setNotice("Publicação salva com sucesso.");
  }

  async function removePost(post: EditorialPost) {
    if (!window.confirm("Confirma a exclusão desta notícia?")) return;
    if (!await persist({ ...data, posts: data.posts.filter((entry) => entry.id !== post.id) })) return;
    setNotice("Notícia excluída.");
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = addingCategory.trim();
    if (!uniqueCategoryName(data.categories, name)) {
      setNotice("Digite um nome de categoria válido e ainda não utilizado.");
      return;
    }
    if (!await persist({ ...data, categories: [...data.categories, { id: crypto.randomUUID(), name }] })) return;
    setAddingCategory("");
    setNotice("Categoria '" + name + "' criada com sucesso.");
  }

  async function renameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renamingId || !uniqueCategoryName(data.categories, renamingValue, renamingId)) {
      setNotice("Nome inválido ou já utilizado em outra categoria.");
      return;
    }
    if (!await persist({
      ...data,
      categories: data.categories.map((cat) => cat.id === renamingId ? { ...cat, name: renamingValue.trim() } : cat),
    })) return;
    setRenamingId(null);
    setNotice("Categoria renomeada. As notícias vinculadas foram preservadas.");
  }

  async function deleteCategory(id: string) {
    const count = data.posts.filter((post) => post.categoryId === id).length;
    if (count) {
      setNotice("Esta categoria tem " + count + " notícia(s). Reclassifique as notícias antes de excluir.");
      return;
    }
    if (!window.confirm("Excluir esta categoria vazia?")) return;
    if (!await persist({ ...data, categories: data.categories.filter((cat) => cat.id !== id) })) return;
    setNotice("Categoria excluída.");
  }

  const selectedCount = drafts.filter((d) => d.selected).length;

  if (loading) {
    return <div className="rounded-2xl border border-[#dfe6eb] bg-white p-8 text-sm text-[#567186]" role="status">Carregando o painel editorial…</div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-[#ead6b9] bg-[#fff9ec] p-8 text-sm text-[#754b29]">
      <p>{error}</p>
      <button type="button" className={primary + " mt-4"} onClick={() => void reload()}>Tentar novamente</button>
    </div>;
  }

  return (
    <div className="space-y-7 font-sans text-[#142e44]">
      <header className="overflow-hidden rounded-2xl bg-[#0a2945] p-6 text-white md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className={overline + " text-[#dcba75]"}>Robson Santiago • Central editorial</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Panorama 360°</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#ced9e4]">Gerencie notícias e categorias. Para uma edição completa, cole o texto e revise tudo de uma vez.</p>
          </div>
          <Link href="/financas" className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Ver portal de notícias ↗</Link>
        </div>
      </header>

      <div role="note" className="rounded-xl border border-[#ead09c] bg-[#fff9e9] px-4 py-3 text-sm leading-relaxed text-[#775829]">
        {mode === "demo"
          ? <><strong>Protótipo interativo:</strong> alterações armazenadas somente neste navegador, sem gravação no Supabase.</>
          : <><strong>Gestão editorial real:</strong> alterações são gravadas no Supabase. Notícias publicadas aparecem no portal público. Revise os fatos e as fontes antes de publicar.</>}
        {busy ? <p className="mt-2 font-semibold" role="status">Salvando alterações no servidor…</p> : null}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[#d7e1e8] pb-3" aria-label="Áreas do painel editorial">
        {([
          ["visao", "Visão geral"],
          ["importar", "Importar notícias em lote"],
          ["publicacoes", "Publicações"],
          ["categorias", "Categorias"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => goTo(id)}
            className={"shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition " + (view === id ? "bg-[#092b49] text-white" : "bg-white text-[#526b80] hover:bg-[#edf3f7]")}>{label}</button>
        ))}
      </div>

      {notice ? <p role="status" className="rounded-xl border border-[#cfe2d7] bg-[#f0f8f3] p-4 text-sm font-semibold text-[#2e6f4b]">{notice}</p> : null}

      {view === "visao" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores editoriais">
            {[
              ["Notícias publicadas", published, mode === "demo" ? "Visíveis na prévia" : "Visíveis no portal"],
              ["Rascunhos", draftCount, "Aguardando revisão"],
              ["Categorias", data.categories.length, "Criadas no painel"],
              ["Total de publicações", data.posts.length, mode === "demo" ? "Conteúdo de demonstração" : "Cadastradas no Supabase"],
            ].map(([label, value, subtitle], i) => (
              <div key={label} className={"rounded-2xl border p-5 " + (i === 0 ? "border-[#0a2945] bg-[#0a2945] text-white" : "border-[#e0e6ed] bg-white")}>
                <p className={overline + (i === 0 ? " text-[#c4d6e5]" : " text-[#708296]")}>{label}</p>
                <p className="mt-3 text-4xl font-extrabold">{value}</p>
                <p className={"mt-2 text-xs " + (i === 0 ? "text-[#cfdeeb]" : "text-[#728698]")}>{subtitle}</p>
              </div>
            ))}
          </section>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className={panel + " p-5 md:p-7"}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className={overline + " text-[#a17a3e]"}>Sua central de conteúdo</p><h2 className="mt-2 text-xl font-extrabold">Publicações recentes</h2></div>
                <button type="button" className="text-sm font-bold text-[#1b628d] hover:underline" onClick={() => goTo("publicacoes")}>Ver todas →</button>
              </div>
              <div className="mt-5 divide-y divide-[#e8edf1]">
                {recentPosts.map((post) => (
                  <div key={post.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-relaxed">{post.title}</p>
                      <p className="mt-1 text-xs text-[#70869a]">{data.categories.find((cat) => cat.id === post.categoryId)?.name || "Categoria"} • {formatEditorialDate(post.publishedAt)}</p>
                    </div>
                    <span className={"rounded-full px-3 py-1 text-xs font-bold " + (post.status === "Publicado" ? "bg-[#e8f6eb] text-[#2c7048]" : "bg-[#fff3d8] text-[#8c652b]")}>{post.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <aside className={panel + " p-6"}>
              <p className={overline + " text-[#a17a3e]"}>Publicar sem complicação</p>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight">Um Panorama inteiro, de uma só vez.</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#667d90]">Cole o texto da edição. A prévia identifica matérias numeradas e separa o bloco “Por que importa?”. Você revisa e escolhe o que publicar.</p>
              <button type="button" onClick={() => goTo("importar")} className={primary + " mt-6 w-full"}>Importar texto completo →</button>
              <button type="button" onClick={() => { goTo("publicacoes"); setEditing(newPost(data.categories[0]?.id || "")); }} className={secondary + " mt-3 w-full"}>Escrever notícia avulsa</button>
              <button type="button" onClick={() => goTo("categorias")} className="mt-5 w-full text-center text-sm font-bold text-[#1d628f] hover:underline">Gerenciar categorias →</button>
            </aside>
          </section>
        </>
      ) : null}

      {view === "importar" ? (
        <div className="space-y-6">
          <section className={panel + " p-5 md:p-7"}>
            <p className={overline + " text-[#a47c39]"}>Publicação em lote</p>
            <h2 className="mt-2 text-2xl font-extrabold">Cole a edição completa do Panorama</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#667b8e]">Use o texto que o Robson já prepara. A demonstração reconhece matérias que começam por “1. Título”, “2. Título” e assim por diante, além de seções como Brasil, Mundo e “Por que importa?”. Não é necessário preencher um formulário por notícia.</p>
            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="block text-sm font-semibold">Texto completo
                <textarea value={rawText} onChange={(e) => { setRawText(e.target.value); setDrafts([]); }} rows={13} className={field + " font-mono text-xs leading-relaxed"} placeholder={"Cole aqui o PANORAMA 360° completo...\n\n🇧🇷 BRASIL — ECONOMIA E POLÍTICA\n1. Título da notícia\nTexto...\nPOR QUE IMPORTA?\nImpacto..."} />
              </label>
              <div>
                <label className="block text-sm font-semibold">Data das notícias
                  <input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} className={field} />
                </label>
                <p className="mt-4 rounded-xl bg-[#edf3f8] p-4 text-xs leading-relaxed text-[#5b7589]">Todas as notícias importadas recebem a data escolhida. Ela poderá ser editada individualmente antes da publicação.</p>
                <button type="button" onClick={() => { setRawText(exampleText); setDrafts([]); }} className={secondary + " mt-4 w-full"}>Carregar exemplo</button>
                <button type="button" disabled={!rawText.trim() || !importDate} onClick={analyzeImport} className={primary + " mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40"}>Separar notícias →</button>
              </div>
            </div>
          </section>

          {drafts.length ? (
            <section className={panel + " p-5 md:p-7"}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={overline + " text-[#a47c39]"}>Revisão antes da publicação</p>
                  <h3 className="mt-2 text-xl font-extrabold">{drafts.length} matérias encontradas</h3>
                  <p className="mt-2 text-sm text-[#647a8d]">{selectedCount} selecionada(s). Abra cada matéria para conferir título, texto, impacto e categoria.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setDrafts(drafts.map((draft) => ({ ...draft, selected: true })))} className={secondary}>Selecionar todas</button>
                  <button type="button" onClick={() => setDrafts(drafts.map((draft) => ({ ...draft, selected: false })))} className={secondary}>Desmarcar</button>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {drafts.map((draft, index) => (
                  <div key={draft.id} className="overflow-hidden rounded-xl border border-[#dce5ed] bg-[#fcfdff]">
                    <div className="flex items-start gap-3 p-4">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0b2a45]" aria-label={"Selecionar notícia " + (index + 1)}
                        checked={draft.selected} onChange={(e) => setDrafts(drafts.map((entry) => entry.id === draft.id ? { ...entry, selected: e.target.checked } : entry))} />
                      <details className="min-w-0 flex-1">
                        <summary className="cursor-pointer text-sm font-bold leading-relaxed">{String(index + 1).padStart(2, "0")} • {draft.title} <span className="ml-2 text-xs font-normal text-[#7690a3]">(abrir e revisar)</span></summary>
                        <div className="mt-5 border-t border-[#e2e9ef] pt-5">
                          <FormFields value={draft} categories={data.categories} onChange={(next) => updateDraft(draft.id, next)} />
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-[#e6edf2] pt-5">
                <button type="button" onClick={() => commitImport("Rascunho")} disabled={!selectedCount || busy} className={secondary + " disabled:opacity-40"}>Salvar selecionadas como rascunho</button>
                <button type="button" onClick={() => commitImport("Publicado")} disabled={!selectedCount || busy} className={primary + " disabled:opacity-40"}>Publicar selecionadas na prévia →</button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#72869a]">A separação é automática, mas a conferência dos fatos, fontes e categorias deve ser feita pelo administrador. A publicação requer revisão manual de cada notícia e de suas fontes.</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {view === "publicacoes" ? (
        <section className={panel + " p-5 md:p-7"}>
          {editing ? (
            <form onSubmit={savePost} className="mx-auto max-w-[740px]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className={overline + " text-[#a17a3e]"}>Editor de notícias</p><h2 className="mt-2 text-2xl font-extrabold">{data.posts.some((p) => p.id === editing.id) ? "Editar publicação" : "Nova publicação"}</h2></div>
                <button type="button" onClick={() => setEditing(null)} className={secondary}>Cancelar</button>
              </div>
              <div className="mt-6"><FormFields value={editing} categories={data.categories} onChange={setEditing} /></div>
              <button type="submit" disabled={busy} className={primary + " mt-6 disabled:opacity-40"}>Salvar publicação</button>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><p className={overline + " text-[#a17a3e]"}>Gestão editorial</p><h2 className="mt-2 text-2xl font-extrabold">Todas as notícias</h2></div>
                <button type="button" className={primary} onClick={() => setEditing(newPost(data.categories[0]?.id || ""))}>+ Nova notícia</button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px]">
                <label className="text-sm font-semibold">Pesquisar
                  <input className={field} type="search" value={postQuery} onChange={(e) => setPostQuery(e.target.value)} placeholder="Título da publicação" />
                </label>
                <label className="text-sm font-semibold">Status
                  <select className={field} value={postStatus} onChange={(e) => setPostStatus(e.target.value)}><option>Todos</option><option>Publicado</option><option>Rascunho</option></select>
                </label>
              </div>
              <div className="mt-6 divide-y divide-[#e7edf2]">
                {shownPosts.map((post) => (
                  <article key={post.id} className="flex flex-wrap items-center gap-4 py-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-relaxed">{post.title}</p>
                      <p className="mt-1 text-xs text-[#74879a]">{data.categories.find((cat) => cat.id === post.categoryId)?.name || "Categoria não encontrada"} • {formatEditorialDate(post.publishedAt)}</p>
                    </div>
                    <span className={"rounded-full px-3 py-1.5 text-xs font-bold " + (post.status === "Publicado" ? "bg-[#e8f5ec] text-[#33744c]" : "bg-[#fff2d9] text-[#96702d]")}>{post.status}</span>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="rounded-lg border border-[#cad9e3] px-3 py-2 text-xs font-bold text-[#266188] hover:bg-[#eff4f8]" onClick={() => setEditing({ ...post })}>Editar</button>
                      <button type="button" className="rounded-lg border border-[#ead1d1] px-3 py-2 text-xs font-bold text-[#a15353] hover:bg-[#fff1f1]" onClick={() => removePost(post)}>Excluir</button>
                    </div>
                  </article>
                ))}
                {!shownPosts.length ? <p className="py-12 text-center text-sm text-[#667e90]">Nenhuma publicação encontrada.</p> : null}
              </div>
            </>
          )}
        </section>
      ) : null}

      {view === "categorias" ? (
        <section className={panel + " p-5 md:p-7"}>
          <p className={overline + " text-[#a17a3e]"}>Organização por temas</p>
          <h2 className="mt-2 text-2xl font-extrabold">Categorias de notícias</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#647b8d]">Crie os temas que fazem sentido para o Robson. As categorias não são fixas no código: o que aparecer no portal será definido aqui.</p>
          <form onSubmit={addCategory} className="mt-6 flex flex-wrap items-end gap-3">
            <label className="min-w-[230px] flex-1 text-sm font-semibold">Nome da nova categoria
              <input className={field} value={addingCategory} onChange={(e) => setAddingCategory(e.target.value)} placeholder="Ex.: Tecnologia, Agro, Geopolítica" required />
            </label>
            <button type="submit" className={primary}>+ Adicionar categoria</button>
          </form>
          <div className="mt-7 divide-y divide-[#e7edf2]">
            {data.categories.map((cat) => {
              const count = data.posts.filter((post) => post.categoryId === cat.id).length;
              return (
                <div key={cat.id} className="flex flex-wrap items-center gap-3 py-4">
                  {renamingId === cat.id ? (
                    <form onSubmit={renameCategory} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <input className="min-w-[150px] flex-1 rounded-lg border border-[#cbd7e1] p-2 text-sm" value={renamingValue} onChange={(e) => setRenamingValue(e.target.value)} required aria-label="Novo nome da categoria" />
                      <button type="submit" className="rounded-lg bg-[#0b2a45] px-3 py-2 text-xs font-bold text-white">Salvar</button>
                      <button type="button" className="text-xs font-bold text-[#5d7485]" onClick={() => setRenamingId(null)}>Cancelar</button>
                    </form>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 font-bold">{cat.name}</span>
                      <span className="text-xs text-[#71879b]">{count} {count === 1 ? "notícia" : "notícias"}</span>
                      <button type="button" className="rounded-lg border border-[#cbd7e1] px-3 py-2 text-xs font-bold text-[#315d7d]" onClick={() => { setRenamingId(cat.id); setRenamingValue(cat.name); }}>Renomear</button>
                      <button type="button" className="rounded-lg border border-[#ead1d1] px-3 py-2 text-xs font-bold text-[#a15353]" onClick={() => deleteCategory(cat.id)}>Excluir</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-5 rounded-xl bg-[#edf4f9] p-4 text-sm text-[#566f84]">Uma categoria com notícias vinculadas não pode ser excluída imediatamente. Primeiro, altere a categoria dessas notícias para preservar sua organização.</p>
        </section>
      ) : null}

      <p className="border-t border-[#dce5ec] pt-5 text-xs leading-relaxed text-[#788a9c]">
        A gestão editorial utiliza o Supabase no ADM autenticado. No endereço demonstrativo, as operações continuam locais. A parte comercial permanece independente.
      </p>
    </div>
  );
}
