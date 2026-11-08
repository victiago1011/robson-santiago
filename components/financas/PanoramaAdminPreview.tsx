"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ROBSON_PANORAMA_PROMPT } from "@/lib/panorama/editorial-prompt";
import MarketThermometerEditor from "@/components/financas/MarketThermometerEditor";
import EditionExtrasEditor from "@/components/financas/EditionExtrasEditor";
import { parseCompleteEdition } from "@/lib/panorama/complete-edition-parser";
import { editionHasContent, type EditionExtras } from "@/lib/panorama/edition-extras";
import {
  formatEditorialDate,
  uniqueCategoryName,
  usePanoramaContent,
  type EditorialPost,
  type EditorialState,
} from "@/lib/panorama/editorial-client";

type View = "visao" | "importar" | "publicacoes" | "categorias" | "termometro";
type ImportDraft = EditorialPost & { selected: boolean; duplicate: boolean };
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

function newPost(categoryId: string): EditorialPost {
  return {
    id: crypto.randomUUID(),
    title: "",
    categoryId,
    summary: "",
    content: "",
    impact: "",
    showImpact: false,
    publishedAt: todayInBrazil(),
    status: "Rascunho",
    featured: false,
    source: "Texto próprio de Robson Santiago",
  };
}

function FormFields({
  value, onChange, categories, showStatus = true,
}: {
  value: EditorialPost;
  onChange: (value: EditorialPost) => void;
  categories: { id: string; name: string }[];
  showStatus?: boolean;
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
      <label className="block text-sm font-semibold">Prévia curta (somente quando a notícia estiver recolhida)
        <textarea className={field} rows={2} value={value.summary} onChange={(e) => update({ summary: e.target.value })} placeholder="Primeira informação da notícia (a prévia desaparece na leitura completa)" />
      </label>
      <label className="block text-sm font-semibold">Texto completo
        <textarea required className={field} rows={6} value={value.content} onChange={(e) => update({ content: e.target.value })} placeholder="Escreva a análise, com parágrafos separados por uma linha..." />
      </label>
      <div className="rounded-xl border border-[#d9e5ed] bg-[#f3f7fa] p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#19364d]">
          <input type="checkbox" checked={value.showImpact}
            onChange={(e) => update({ showImpact: e.target.checked })}
            className="h-4 w-4 shrink-0 accent-[#0b2a45]" />
          Exibir “Por que importa?” nesta notícia
        </label>
        <p className="mt-2 text-xs leading-relaxed text-[#657b8c]">
          Opcional para notícias curtas. Desmarcar oculta o bloco no portal, mas preserva o texto já escrito.
        </p>
        {value.showImpact ? (
          <label className="mt-4 block text-sm font-semibold">
            Texto do “Por que importa?”
            <textarea className={field} rows={3} value={value.impact}
              onChange={(e) => update({ impact: e.target.value })}
              placeholder="Explique por que este assunto importa para o leitor." />
          </label>
        ) : null}
      </div>
      <label className="block text-sm font-semibold">Fonte ou referência
        <input className={field} value={value.source} onChange={(e) => update({ source: e.target.value })} placeholder="Link ou identificação da fonte" />
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-[#d9e5ed] bg-[#f1f7fa] p-4 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#0b2a45]" checked={value.featured}
          onChange={(e) => update({ featured: e.target.checked })} />
        <span><strong>Destacar no resumo de 60 segundos</strong>
          <span className="mt-1 block text-xs leading-relaxed text-[#647c8f]">
            Opcional. As matérias destacadas têm prioridade entre os cinco assuntos mais recentes da data.
            Caso nenhuma seja destacada, o portal usa as notícias mais recentes automaticamente.
          </span>
        </span>
      </label>
      {showStatus ? <label className="block text-sm font-semibold">Status
        <select className={field} value={value.status} onChange={(e) => update({ status: e.target.value as EditorialPost["status"] })}>
          <option value="Rascunho">Rascunho</option>
          <option value="Publicado">Publicado (visível no site)</option>
        </select>
      </label> : <p className="rounded-lg border border-[#ead6a9] bg-[#fff8e6] px-4 py-3 text-sm text-[#6f572a]">
        Importações são salvas apenas como <strong>rascunho</strong>. A publicação acontecerá depois, na revisão da edição.
      </p>}
    </div>
  );
}

export default function PanoramaAdminPreview({ initialData, initialEditions = [] }: {
  initialData?: EditorialState; initialEditions?: EditionExtras[];
}) {
  const { data, save, loading, busy, error, reload } = usePanoramaContent(initialData);
  const [view, setView] = useState<View>("visao");
  const [rawText, setRawText] = useState("");
  const [importDate, setImportDate] = useState(todayInBrazil);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [editions, setEditions] = useState<EditionExtras[]>(initialEditions);
  const [pendingSections, setPendingSections] = useState<EditionExtras | null>(null);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<EditorialPost | null>(null);
  const [addingCategory, setAddingCategory] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [postQuery, setPostQuery] = useState("");
  const [postStatus, setPostStatus] = useState("Todos");
  const [reviewDate, setReviewDate] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const noticeIsError = /^(Confira|Não|Falha|Erro|Selecione|Digite|Nome inválido|Serviço|Conflito|Acesso|Campos inválidos)/i.test(notice);
  const published = data.posts.filter((post) => post.status === "Publicado").length;
  const draftCount = data.posts.length - published;
  const recentPosts = [...data.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 5);
  const draftDays = useMemo(() => [...new Set([
    ...data.posts.filter((post) => post.status === "Rascunho").map((post) => post.publishedAt),
    ...editions.filter((item) => item.status === "draft" && editionHasContent(item)).map((item) => item.published_on),
  ])].sort((a, b) => b.localeCompare(a)), [data.posts, editions]);
  const editionPosts = useMemo(() => data.posts.filter((post) => post.publishedAt === reviewDate)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")), [data.posts, reviewDate]);
  const shownPosts = useMemo(() => data.posts.filter((post) => (
    (postStatus === "Todos" || post.status === postStatus)
    && [post.title, post.summary].some((part) => part.toLocaleLowerCase("pt-BR").includes(postQuery.trim().toLocaleLowerCase("pt-BR")))
  )).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [data.posts, postQuery, postStatus]);

  function goTo(next: View) {
    setView(next);
    setNotice("");
    setEditing(null);
    setReviewDate(null);
  }

  function analyzeImport() {
    const extracted = parseCompleteEdition(rawText, importDate, data.categories);
    const output = extracted.posts;
    setPendingSections({
      published_on: importDate, agenda_items: extracted.agenda, historical_events: [],
      commentary_title: extracted.commentaryTitle, commentary_body: extracted.commentaryBody, status: "draft",
    });
    const existing = new Set(data.posts.map((post) => post.publishedAt + "|" + post.title.trim().toLocaleLowerCase("pt-BR")));
    const duplicateCount = output.filter((post) => existing.has(post.publishedAt + "|" + post.title.trim().toLocaleLowerCase("pt-BR"))).length;
    setDrafts(output.map((post) => ({
      ...post,
      selected: !existing.has(post.publishedAt + "|" + post.title.trim().toLocaleLowerCase("pt-BR")),
      duplicate: existing.has(post.publishedAt + "|" + post.title.trim().toLocaleLowerCase("pt-BR")),
    })));
    setNotice(output.length
      ? output.length + " notícia(s) identificada(s). " + (duplicateCount
        ? duplicateCount + " já cadastrada(s) nesta data foram desmarcadas para evitar duplicação. "
        : "") + "Revise antes de salvar."
      : "Não encontrei notícias numeradas. Use títulos como '1. Título da notícia', separados por linhas.");
  }

  function updateDraft(id: string, next: EditorialPost) {
    setDrafts((prev) => prev.map((draft) => draft.id === id ? { ...next, selected: draft.selected, duplicate: draft.duplicate } : draft));
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

  async function commitImport() {
    const chosen = drafts.filter((draft) => draft.selected && !draft.duplicate && draft.title.trim() && draft.content.trim());
    if (!chosen.length) {
      setNotice("Selecione ao menos uma notícia com título e texto para continuar.");
      return;
    }
    const posts = chosen.map(({ selected: _selected, duplicate: _duplicate, ...post }) => ({ ...post, status: "Rascunho" as const }));
    if (!await persist({ ...data, posts: [...posts, ...data.posts] })) return;
    if (pendingSections && editionHasContent(pendingSections)) {
      try {
        await saveEditionSections(pendingSections);
      } catch (cause) {
        setNotice("Notícias salvas, mas os complementos editoriais não: " + (cause instanceof Error ? cause.message : "revise mais tarde."));
        setReviewDate(importDate); setView("publicacoes");
        return;
      }
    }
    setDrafts([]);
    setPendingSections(null);
    setRawText("");
    setNotice(posts.length + " rascunho(s) salvo(s). Revise a edição completa antes de publicar.");
    setReviewDate(importDate);
    setView("publicacoes");
  }

  async function saveEditionSections(payload: EditionExtras) {
    const response = await fetch("/api/admin/panorama/editions", {
      method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        published_on: payload.published_on, agenda_items: payload.agenda_items.filter((item) => item.text.trim()),
        historical_events: payload.historical_events,
        commentary_title: payload.commentary_title, commentary_body: payload.commentary_body,
      }),
    });
    if (!response.ok) {
      const info = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(info.error || "Não foi possível salvar os complementos.");
    }
    setEditions((current) => [...current.filter((item) => item.published_on !== payload.published_on), { ...payload, status: "draft" }]);
  }

  async function reloadEditions() {
    const response = await fetch("/api/admin/panorama/editions", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Não foi possível carregar os complementos.");
    const info = await response.json() as { editions: EditionExtras[] };
    setEditions(info.editions);
  }

  async function publishEdition() {
    if (!reviewDate || publishing) return;
    const count = editionPosts.filter((post) => post.status === "Rascunho").length;
    const pendingExtras = editions.find((item) => item.published_on === reviewDate
      && item.status === "draft" && editionHasContent(item));
    if (!count && !pendingExtras) {
      setNotice("Não há rascunhos nem complementos pendentes para publicar.");
      return;
    }
    if (!window.confirm(
      "Publicar " + count + " notícia(s)" + (pendingExtras ? " e os complementos editoriais" : "")
      + " da edição de " + formatEditorialDate(reviewDate)
      + "? Confirme que revisou notícias, agenda, análise e fontes.",
    )) return;
    setPublishing(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/panorama", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "edition:publish", date: reviewDate }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error || "Falha ao publicar a edição.");
      }
      const result = await response.json() as { published: number };
      await Promise.all([reload(), reloadEditions()]);
      setNotice(result.published + " notícia(s) publicadas, incluindo complementos aprovados, em " + formatEditorialDate(reviewDate) + ".");
      setReviewDate(null);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Não foi possível publicar a edição.");
    } finally {
      setPublishing(false);
    }
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
        <strong>Gestão editorial:</strong> alterações são gravadas no Supabase. Notícias publicadas aparecem no portal público. Revise os fatos e as fontes antes de publicar.
        {busy ? <p className="mt-2 font-semibold" role="status">Salvando alterações no servidor…</p> : null}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[#d7e1e8] pb-3" aria-label="Áreas do painel editorial">
        {([
          ["visao", "Visão geral"],
          ["importar", "Colar edição completa"],
          ["publicacoes", "Publicações"],
          ["categorias", "Categorias"],
          ["termometro", "Termômetro econômico"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => goTo(id)}
            className={"shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition " + (view === id ? "bg-[#092b49] text-white" : "bg-white text-[#526b80] hover:bg-[#edf3f7]")}>{label}</button>
        ))}
      </div>

      {notice ? <p role={noticeIsError ? "alert" : "status"} className={"rounded-xl border p-4 text-sm font-semibold " + (noticeIsError ? "border-[#e8c7c0] bg-[#fff2ef] text-[#913d31]" : "border-[#cfe2d7] bg-[#f0f8f3] text-[#2e6f4b]")}>{notice}</p> : null}

      {view === "termometro" ? <MarketThermometerEditor dates={[...new Set([...data.posts.map((post) => post.publishedAt), ...editions.map((edition) => edition.published_on)])].sort((a, b) => b.localeCompare(a))} /> : null}

      {view === "visao" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores editoriais">
            {[
              ["Notícias publicadas", published, "Visíveis no portal"],
              ["Rascunhos", draftCount, "Aguardando revisão"],
              ["Categorias", data.categories.length, "Criadas no painel"],
              ["Total de publicações", data.posts.length, "Cadastradas no Supabase"],
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
              <p className="mt-3 text-sm leading-relaxed text-[#667d90]">Cole o texto da edição. O importador identifica matérias numeradas e separa o bloco “Por que importa?”. As notícias ficam em rascunho até a aprovação da edição.</p>
              <button type="button" onClick={() => goTo("importar")} className={primary + " mt-6 w-full"}>Escrever ou colar edição completa →</button>
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
            <h2 className="mt-2 text-2xl font-extrabold">Escreva ou cole a edição completa</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#667b8e]">
              Escreva ou cole o texto da edição no formato estruturado: matérias numeradas, categorias, “Por que importa?” opcional e, ao final, a análise do comentarista quando houver. O resumo é apenas uma prévia: ao abrir a notícia, o texto completo aparece sem repetição.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#c8ddeb] bg-[#f1f7fb] p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#193f5c]">O Robson prepara o Panorama pelo ChatGPT Plus?</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5f798c]">
                  Use o prompt editorial padronizado para gerar a edição sem repetição, com fontes verificáveis, numeração e categorias reconhecidas pelo importador.
                </p>
              </div>
              <button type="button" className={secondary}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(ROBSON_PANORAMA_PROMPT);
                    setNotice("Prompt editorial copiado! Cole no ChatGPT Plus do Robson e envie a data e as notícias.");
                  } catch {
                    setNotice("Não foi possível copiar o prompt automaticamente. Verifique a permissão de área de transferência do navegador.");
                  }
                }}>
                📋 Copiar prompt para o ChatGPT Plus
              </button>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="block text-sm font-semibold">Escreva ou cole o Panorama completo
                <textarea value={rawText} onChange={(e) => { setRawText(e.target.value); setDrafts([]); setPendingSections(null); }} rows={13} className={field + " font-mono text-xs leading-relaxed"} placeholder={"Cole aqui o PANORAMA 360° completo...\n\n🇧🇷 BRASIL — ECONOMIA E POLÍTICA\n1. Título da notícia\nTexto...\nPOR QUE IMPORTA?\nImpacto..."} />
              </label>
              <div>
                <label className="mt-4 block text-sm font-semibold">Data da edição
                  <input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} className={field} />
                </label>
                <p className="mt-4 rounded-xl bg-[#edf3f8] p-4 text-xs leading-relaxed text-[#5b7589]">Todas as notícias importadas recebem a data escolhida. Ela poderá ser editada individualmente antes da publicação.</p>
                
                <button type="button" disabled={!rawText.trim() || !importDate} onClick={analyzeImport} className={primary + " mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40"}>Organizar notícias, agenda e análise →</button>
              </div>
            </div>
          </section>

          {pendingSections && editionHasContent(pendingSections) ? (
            <div className="rounded-2xl border border-[#d8dfeb] bg-[#f0f6fb] p-5 text-sm leading-relaxed text-[#295574]">
              <strong>Seções especiais identificadas:</strong> {pendingSections.agenda_items.length} itens da antiga Agenda do Investidor serão preservados no registro da edição, mas não aparecerão como marcos históricos.
              {pendingSections.commentary_body ? " e A Visão do Comentarista (" + pendingSections.commentary_title + ")." : "."}
              Serão salvos como rascunho junto das notícias e poderão ser editados na revisão.
            </div>
          ) : null}
          {drafts.length ? (
            <section className={panel + " p-5 md:p-7"}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className={overline + " text-[#a47c39]"}>Revisão antes da publicação</p>
                  <h3 className="mt-2 text-xl font-extrabold">{drafts.length} matérias encontradas</h3>
                  <p className="mt-2 text-sm text-[#647a8d]">{selectedCount} selecionada(s). Abra cada matéria para conferir título, texto, impacto e categoria.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setDrafts(drafts.map((draft) => ({ ...draft, selected: !draft.duplicate })))} className={secondary}>Selecionar todas</button>
                  <button type="button" onClick={() => setDrafts(drafts.map((draft) => ({ ...draft, selected: false })))} className={secondary}>Desmarcar</button>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {drafts.map((draft, index) => (
                  <div key={draft.id} className="overflow-hidden rounded-xl border border-[#dce5ed] bg-[#fcfdff]">
                    <div className="flex items-start gap-3 p-4">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0b2a45]" aria-label={"Selecionar notícia " + (index + 1)}
                        checked={draft.selected} disabled={draft.duplicate} onChange={(e) => setDrafts(drafts.map((entry) => entry.id === draft.id ? { ...entry, selected: e.target.checked } : entry))} />
                      <details className="min-w-0 flex-1">
                        <summary className="cursor-pointer text-sm font-bold leading-relaxed">{String(index + 1).padStart(2, "0")} • {draft.title} <span className="ml-2 text-xs font-normal text-[#7690a3]">{draft.duplicate ? "(já cadastrada — não será importada novamente)" : "(abrir e revisar)"}</span></summary>
                        <div className="mt-5 border-t border-[#e2e9ef] pt-5">
                          <FormFields value={draft} categories={data.categories} onChange={(next) => updateDraft(draft.id, next)} showStatus={false} />
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-[#e6edf2] pt-5">
                <button type="button" onClick={() => void commitImport()} disabled={!selectedCount || busy} className={primary + " disabled:opacity-40"}>Salvar {selectedCount} como rascunho e revisar →</button>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#72869a]">A separação é automática, mas nenhuma notícia é publicada nesta etapa. Salve os rascunhos, revise a edição em Publicações e só então confirme a publicação.</p>
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
          ) : reviewDate ? (
            <section aria-label="Revisão da edição antes de publicar">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={overline + " text-[#a17a3e]"}>Revisão editorial · acesso restrito</p>
                  <h2 className="mt-2 text-2xl font-extrabold">Edição de {formatEditorialDate(reviewDate)}</h2>
                  <p className="mt-2 text-sm text-[#647b8d]">
                    {editionPosts.length} notícias nesta edição, {editionPosts.filter((post) => post.status === "Rascunho").length} aguardando aprovação.
                    Confira o texto, o bloco “Por que importa?” e as fontes antes de publicar.
                  </p>
                </div>
                <button type="button" onClick={() => setReviewDate(null)} className={secondary}>← Voltar às publicações</button>
              </div>

              <div className="mt-6 space-y-6">
                {data.categories.map((category) => ({
                  category,
                  posts: editionPosts.filter((post) => post.categoryId === category.id),
                })).filter((group) => group.posts.length > 0).map((group) => (
                  <div key={group.category.id} className="overflow-hidden rounded-xl border border-[#dae3eb]">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#eaf1f7] px-5 py-4">
                      <h3 className="text-lg font-extrabold">{group.category.name}</h3>
                      <span className="text-xs text-[#547086]">{group.posts.length} {group.posts.length === 1 ? "notícia" : "notícias"}</span>
                    </div>
                    <div className="divide-y divide-[#e3eaf0]">
                      {group.posts.map((post) => (
                        <article key={post.id} className="px-5 py-4">
                          <details>
                            <summary className="cursor-pointer text-sm font-bold leading-relaxed text-[#1a3b56]">
                              {post.title} <span className={"ml-2 text-xs font-semibold " + (post.status === "Rascunho" ? "text-[#98732b]" : "text-[#2b7953]")}>
                                ({post.status})
                              </span>
                            </summary>
                            <div className="mt-4 space-y-4 border-t border-[#e5ecf1] pt-4 text-sm leading-relaxed text-[#37566d]">
                              {post.summary ? <p className="font-semibold">{post.summary}</p> : null}
                              <p className="whitespace-pre-wrap">{post.content}</p>
                              {post.showImpact && post.impact ? <div className="rounded-lg border-l-4 border-[#d6a751] bg-[#f3f7fa] p-4">
                                <p className="font-bold">Por que importa?</p>
                                <p className="mt-2 whitespace-pre-wrap">{post.impact}</p>
                              </div> : null}
                              <p className="text-xs text-[#657d8d]">Fonte: {post.source || "Não informada"}</p>
                              <button type="button" className={secondary} onClick={() => setEditing({ ...post })}>Editar notícia</button>
                            </div>
                          </details>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <EditionExtrasEditor key={reviewDate} day={reviewDate}
                saved={editions.find((item) => item.published_on === reviewDate)}
                onSaved={(item) => setEditions((current) => [...current.filter((value) => value.published_on !== item.published_on), item])} />
              <div className="mt-7 rounded-xl border border-[#d6e2eb] bg-[#f3f8fb] p-5">
                <p className="text-sm leading-relaxed text-[#416278]">
                  <strong>Publicação definitiva:</strong> esta ação tornará públicas todas as notícias que ainda estão em rascunho
                  nesta data. Nada é publicado automaticamente ao colar ou salvar o texto.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" disabled={publishing || busy || (!editionPosts.some((post) => post.status === "Rascunho") &&
                    !editions.some((item) => item.published_on === reviewDate && item.status === "draft" && editionHasContent(item)))}
                    onClick={() => void publishEdition()}
                    className={primary + " disabled:cursor-not-allowed disabled:opacity-40"}>
                    {publishing ? "Publicando edição…" : "Aprovar e publicar edição de " + formatEditorialDate(reviewDate)}
                  </button>
                  <button type="button" onClick={() => setReviewDate(null)} className={secondary}>Continuar revisando depois</button>
                </div>
              </div>
            </section>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><p className={overline + " text-[#a17a3e]"}>Gestão editorial</p><h2 className="mt-2 text-2xl font-extrabold">Todas as notícias</h2></div>
                <button type="button" className={primary} onClick={() => setEditing(newPost(data.categories[0]?.id || ""))}>+ Nova notícia</button>
              </div>
              {draftDays.length ? (
                <section aria-labelledby="edition-drafts-title" className="mt-6 rounded-2xl border border-[#dcc79e] bg-[#fffbf0] p-5">
                  <p className={overline + " text-[#a07839]"}>Aguardando aprovação</p>
                  <h3 id="edition-drafts-title" className="mt-2 text-lg font-extrabold">Edições com notícias em rascunho</h3>
                  <p className="mt-1 text-sm text-[#6b7581]">
                    Revise os textos e publique a edição inteira somente quando estiver pronta.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {draftDays.map((date) => {
                      const pendingCount = data.posts.filter((post) => post.publishedAt === date && post.status === "Rascunho").length;
                      return (
                        <button key={date} type="button" onClick={() => { setReviewDate(date); setNotice(""); }}
                          className="flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3d4b7] bg-white px-4 py-3 text-left text-sm font-semibold text-[#193b56] transition hover:border-[#b59258] hover:bg-[#fffdf8]">
                          <span>Edição de {formatEditorialDate(date)} <span className="block text-xs font-normal text-[#697f8f]">{pendingCount} notícias aguardando</span></span>
                          <span className="text-[#996d2e]">Revisar edição →</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
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
        A gestão editorial utiliza o Supabase e é restrita ao ADM autenticado. A parte comercial permanece independente.
      </p>
    </div>
  );
}
