"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { editionDateFromText, parsePanoramaEdition } from "@/lib/panorama/plain-edition";
import type { TextEdition } from "@/lib/panorama/plain-edition-store";

function brazilToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}
const panel = "rounded-2xl border border-[#dce5ed] bg-white shadow-[0_10px_30px_rgba(10,40,65,0.04)]";
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a45] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#194c70] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#c4d3df] bg-white px-5 py-3 text-sm font-bold text-[#245474] transition hover:bg-[#eff5f8] disabled:opacity-50";

type Action = "save" | "publish" | "unpublish";

export default function PanoramaTextEditor({ initialEditions }: { initialEditions: TextEdition[] }) {
  const [editions, setEditions] = useState(initialEditions);
  const [date, setDate] = useState(brazilToday);
  const [text, setText] = useState(() => initialEditions.find((item) => item.published_on === brazilToday())?.draft_text || "");
  const [savedText, setSavedText] = useState(text);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const current = editions.find((item) => item.published_on === date);
  const dirty = text !== savedText;
  const parsed = useMemo(() => parsePanoramaEdition(text), [text]);

  const selectDate = (day: string) => {
    if (day === date) return;
    if (dirty && !window.confirm("O texto atual tem alterações não salvas. Deseja trocar de data?")) return;
    setDate(day);
    const found = editions.find((item) => item.published_on === day)?.draft_text || "";
    setText(found);
    setSavedText(found);
    setError("");
    setMessage("");
  };
  const receiveText = (value: string) => {
    setText(value);
    setError("");
    setMessage("");
    const identified = editionDateFromText(value);
    if (identified && identified !== date) {
      const stored = editions.find((item) => item.published_on === identified);
      setDate(identified);
      // Content comes from the pasted file; never overwrite it with an old draft.
      setSavedText(stored?.draft_text || "");
    }
  };
  const refresh = async () => {
    const response = await fetch("/api/admin/panorama/texto", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Não foi possível atualizar a lista de edições.");
    const body = await response.json() as { editions: TextEdition[] };
    setEditions(body.editions);
    return body.editions;
  };
  const send = async (action: Action, rawText?: string) => {
    const payload = action === "save" ? { action, date, text: rawText ?? text } : { action, date };
    const response = await fetch("/api/admin/panorama/texto", {
      method: "PUT", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
  };
  const handleAction = async (action: Action) => {
    if (busy) return;
    if (action === "publish" && !window.confirm("Publicar a edição de " + date + " no site? O texto público será substituído pelo rascunho atual.")) return;
    if (action === "unpublish" && !window.confirm("Retirar a edição de " + date + " do site? O rascunho será preservado.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "save" || (action === "publish" && (dirty || !current))) {
        await send("save");
        setSavedText(text.trim().replace(/\r\n?/g, "\n"));
      }
      if (action !== "save") await send(action);
      await refresh();
      setMessage(action === "publish"
        ? "Edição publicada com sucesso. O texto integral já pode ser consultado no Panorama."
        : action === "unpublish"
          ? "Publicação retirada do ar. O texto permanece salvo no painel."
          : "Rascunho salvo. Nada mudou na página pública.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 120000) { setError("O arquivo excede 120 KB."); return; }
    try { receiveText(await file.text()); }
    catch { setError("Não foi possível ler o arquivo TXT."); }
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-7 text-[#12334e]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#b08441]">Publicação simplificada</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Panorama 360°</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#657f94]">Cole o compilado completo do dia. O site identifica a abertura, o termômetro, as notícias e a Visão do Comentarista, sem limitar o número de itens.</p>
        </div>
        <Link href="/financas" target="_blank" className={secondary}>Ver página pública ↗</Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-6">
          <section className={panel + " p-5 sm:p-7"}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <label className="block text-sm font-extrabold">Data da edição
                <input type="date" value={date} onChange={(event) => selectDate(event.target.value)}
                  className="mt-2 block min-h-11 rounded-xl border border-[#c8d6e2] bg-white px-4 py-2 text-base text-[#173b55]" />
              </label>
              <label className={secondary + " cursor-pointer"}>
                <input aria-label="Carregar texto de um arquivo TXT" type="file" accept=".txt,text/plain"
                  className="sr-only" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }} />
                📄 Carregar arquivo TXT
              </label>
            </div>
            {current ? (
              <p className="mt-4 rounded-lg bg-[#edf4fa] px-4 py-3 text-xs font-semibold text-[#3b647e]">
                Já existe uma edição nessa data. Você está editando o rascunho existente, sem criar notícias duplicadas.
                {current.published_text ? " A versão publicada só muda quando clicar em Publicar." : ""}
              </p>
            ) : null}
            <label htmlFor="panorama-text" className="mt-6 block text-sm font-extrabold">Texto integral do Panorama</label>
            <p className="mt-1 text-xs leading-relaxed text-[#6a8499]">Basta copiar e colar o TXT. Os emojis, a sequência dos assuntos e os parágrafos são preservados. A data do cabeçalho é reconhecida automaticamente.</p>
            <textarea id="panorama-text" spellCheck={false} value={text} onChange={(event) => receiveText(event.target.value)}
              rows={22} placeholder={"🌐 PANORAMA 360°\n\nQUINTA-FEIRA, 12 DE NOVEMBRO DE 2026\n\n📌 ABERTURA...\n\n📊 1. TERMÔMETRO ECONÔMICO...\n\n🇧🇷 2. NOTÍCIAS...\n\n✍️ 21. A VISÃO DO COMENTARISTA...\n\nFONTES..."}
              className="mt-3 block min-h-[400px] w-full resize-y rounded-xl border border-[#bfcedb] bg-[#fbfdff] px-4 py-4 font-mono text-[0.85rem] leading-[1.75] text-[#17344b] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#ad8341]" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6d8497]">
              <span>{text.length.toLocaleString("pt-BR")} caracteres • {new TextEncoder().encode(text).byteLength.toLocaleString("pt-BR")} bytes</span>
              <span>{dirty ? "● Alterações não salvas" : "✓ Texto salvo ou ainda vazio"}</span>
            </div>
            {error ? <p role="alert" className="mt-4 rounded-lg border border-[#efb2b2] bg-[#fff2f2] p-4 text-sm font-semibold text-[#9c3131]">{error}</p> : null}
            {message ? <p role="status" className="mt-4 rounded-lg border border-[#b8dfce] bg-[#f2fcf6] p-4 text-sm font-semibold text-[#286648]">{message}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={busy || !text.trim()} onClick={() => void handleAction("save")} className={secondary}>{busy ? "Salvando…" : "Salvar rascunho"}</button>
              <button type="button" disabled={busy || !text.trim() || parsed.news.length === 0} onClick={() => void handleAction("publish")} className={primary}>{busy ? "Processando…" : current?.published_text ? "Atualizar publicação" : "Publicar edição"}</button>
              {current?.published_text ? <button type="button" disabled={busy} onClick={() => void handleAction("unpublish")}
                className="min-h-11 rounded-xl border border-[#e4c1b7] px-4 text-sm font-semibold text-[#a14837] hover:bg-[#fff4f1]">Retirar do ar</button> : null}
            </div>
          </section>
          <section className={panel + " p-5 sm:p-7"}>
            <button type="button" aria-expanded={showPreview} onClick={() => setShowPreview(!showPreview)}
              className="flex w-full items-center justify-between text-left">
              <span className="text-lg font-extrabold">Prévia da organização</span>
              <span className="text-sm font-bold text-[#52758e]">{showPreview ? "Recolher −" : "Expandir +"}</span>
            </button>
            {showPreview ? (
              <div className="mt-5 space-y-4">
                <p className="text-xs text-[#667e92]">O texto não será resumido ou modificado. Esta prévia mostra apenas a separação das seções.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f0f5f9] p-4"><p className="text-2xl font-black">{parsed.news.length}</p><p className="text-xs font-semibold text-[#617d92]">Notícias identificadas</p></div>
                  <div className="rounded-xl bg-[#f0f5f9] p-4"><p className="text-2xl font-black">{parsed.thermometer ? "✓" : "—"}</p><p className="text-xs font-semibold text-[#617d92]">Termômetro</p></div>
                  <div className="rounded-xl bg-[#f0f5f9] p-4"><p className="text-2xl font-black">{parsed.commentary ? "✓" : "—"}</p><p className="text-xs font-semibold text-[#617d92]">Visão do Comentarista</p></div>
                </div>
                {parsed.date && parsed.date !== date ? <p className="text-sm font-bold text-[#ae523f]">Atenção: a data do texto é {parsed.date}, diferente da selecionada.</p> : null}
                {parsed.opening ? <p className="rounded-lg bg-[#eff5fa] p-3 text-sm"><strong>📌 Abertura:</strong> {parsed.opening.title}</p> : null}
                <ol className="space-y-2">
                  {parsed.news.map((section, index) => <li key={index} className="rounded-lg border border-[#e0e9ef] px-3 py-3 text-sm font-semibold">
                    <span className="mr-2 text-[#ae8139]">{String(index + 1).padStart(2, "0")}</span>{section.icon} {section.title}
                  </li>)}
                </ol>
                {parsed.commentary ? <p className="rounded-lg bg-[#0d2b46] p-4 text-sm font-bold text-white">✍️ Visão do Comentarista será destacada com foto e assinatura de Robson Santiago.</p> : null}
                {text && !parsed.news.length ? <p className="text-sm text-[#a45b36]">Nenhuma notícia foi identificada. Verifique se os títulos numerados estão em letras maiúsculas como nos arquivos de exemplo.</p> : null}
              </div>
            ) : null}
          </section>
        </div>

        <aside className={panel + " p-5 sm:p-6"}>
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#ae8340]">Arquivo de edições</p>
          <h2 className="mt-2 text-lg font-extrabold">Publicações salvas</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#6c8395]">Abra uma data para revisar, editar ou republicar seu texto.</p>
          <div className="mt-5 max-h-[560px] space-y-2 overflow-y-auto">
            {editions.length ? editions.map((item) => (
              <button type="button" key={item.published_on} onClick={() => selectDate(item.published_on)}
                aria-pressed={item.published_on === date}
                className={"flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition " +
                  (item.published_on === date ? "border-[#153d5b] bg-[#edf4fa]" : "border-[#dbe5ec] hover:bg-[#f6f9fb]")}>
                <span className="font-extrabold">{item.published_on.split("-").reverse().join("/")}</span>
                <span className={"rounded-full px-2 py-1 text-[0.65rem] font-bold " +
                  (item.published_text ? "bg-[#e2f3e9] text-[#30704d]" : "bg-[#f6ebd3] text-[#946b27]")}>
                  {item.published_text ? "Publicado" : "Rascunho"}
                </span>
              </button>
            )) : <p className="rounded-xl bg-[#f1f5f8] p-4 text-xs text-[#6d8293]">Nenhuma edição no novo formato. Os dias antigos permanecem no site.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
