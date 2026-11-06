"use client";

import { useEffect, useState } from "react";
import type { EditionExtras } from "@/lib/panorama/edition-extras";
import { emptyEditionExtras } from "@/lib/panorama/edition-extras";

const field = "mt-1.5 w-full rounded-lg border border-[#cbd7e1] bg-white px-3 py-3 text-sm text-[#19364d] focus-visible:outline-[#b98a3e]";
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b2a45] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a4d71] disabled:opacity-50";

export default function EditionExtrasEditor({
  day, saved, onSaved,
}: {
  day: string;
  saved?: EditionExtras;
  onSaved: (value: EditionExtras) => void;
}) {
  const [draft, setDraft] = useState<EditionExtras>(() => saved ?? emptyEditionExtras(day));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(saved ?? emptyEditionExtras(day));
    setMessage("");
  }, [day, saved]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {

      const payload = {
        published_on: day,
        agenda_items: draft.agenda_items,
        historical_events: draft.historical_events.filter((item) => item.title.trim()),
        commentary_title: draft.commentary_title,
        commentary_body: draft.commentary_body,
      };
      const response = await fetch("/api/admin/panorama/editions", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error || "Não foi possível salvar.");
      }
      const updated: EditionExtras = { ...payload, status: "draft" };
      onSaved(updated);
      setMessage("Marcos históricos e análise salvos como rascunho. Revise a edição antes de publicar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 space-y-5" aria-label="Complementos da edição">
      <div className="rounded-2xl border border-[#dbe5eb] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#a17a3e]">Nesta data na história</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#143853]">📜 Marcos Históricos desta Data</h3>
          </div>
          <span className={"rounded-full px-3 py-1 text-xs font-bold " + (draft.status === "published" ? "bg-[#e3f2e9] text-[#286b49]" : "bg-[#fff3dc] text-[#956c30]")}>
            {draft.status === "published" ? "Publicada" : "Rascunho"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#687f91]">
          Escolha acontecimentos de outros anos que ocorreram neste mesmo dia e mês.
          Informe o ano, o fato e, de preferência, a fonte consultada. Não há preenchimento automático nem datas inventadas.
        </p>
        <div className="mt-5 space-y-3">
          {draft.historical_events.map((item, index) => (
            <div key={index} className="space-y-4 rounded-xl border border-[#e2eaf0] bg-[#f8fbfd] p-4">
              <div className="grid gap-3 sm:grid-cols-[110px_1fr_auto]">
                <label className="text-xs font-bold">Ano
                  <input type="text" inputMode="numeric" maxLength={4} className={field} placeholder="Ex.: 1989"
                    value={item.year} onChange={(event) => setDraft((cur) => ({
                      ...cur, historical_events: cur.historical_events.map((row,i) => i === index ? { ...row, year: event.target.value } : row),
                    }))} />
                </label>
                <label className="text-xs font-bold">Título do marco histórico
                  <input className={field} maxLength={180} value={item.title} placeholder="O que aconteceu nesta data?"
                    onChange={(event) => setDraft((cur) => ({
                      ...cur, historical_events: cur.historical_events.map((row,i) => i === index ? { ...row, title: event.target.value } : row),
                    }))} />
                </label>
                <button type="button" className="self-end rounded-lg border border-[#d9b9ac] px-4 py-3 text-xs font-bold text-[#8e4f3f]"
                  onClick={() => setDraft((cur) => ({ ...cur, historical_events: cur.historical_events.filter((_,i) => i !== index) }))}>Excluir</button>
              </div>
              <label className="block text-xs font-bold">Contexto (opcional)
                <textarea rows={3} maxLength={1800} className={field} value={item.description}
                  onChange={(event) => setDraft((cur) => ({
                    ...cur, historical_events: cur.historical_events.map((row,i) => i === index ? { ...row, description: event.target.value } : row),
                  }))} />
              </label>
              <label className="block text-xs font-bold">Fonte ou referência para conferência
                <input className={field} maxLength={1000} value={item.source} placeholder="Veículo, livro ou endereço da fonte"
                  onChange={(event) => setDraft((cur) => ({
                    ...cur, historical_events: cur.historical_events.map((row,i) => i === index ? { ...row, source: event.target.value } : row),
                  }))} />
              </label>
            </div>
          ))}
        </div>
        <button type="button" disabled={draft.historical_events.length >= 30}
          className="mt-4 rounded-lg border border-[#b8ccd9] bg-white px-4 py-3 text-sm font-bold text-[#275f83] disabled:opacity-40"
          onClick={() => setDraft((cur) => ({ ...cur, historical_events: [
            ...cur.historical_events, { year: "", title: "", description: "", source: "" },
          ] }))}>+ Adicionar marco histórico</button>
        {draft.agenda_items.length > 0 ? (
          <p className="mt-5 rounded-lg bg-[#fff8e8] px-4 py-3 text-xs text-[#86662f]">
            A antiga Agenda do Investidor desta edição permanece arquivada, mas não é exibida como acontecimento histórico.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[#dbe5eb] bg-white p-5 md:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#a17a3e]">Encerramento da edição</p>
        <h3 className="mt-2 text-xl font-extrabold text-[#143853]">✍️ A Visão do Comentarista</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#687f91]">
          Esta análise encerra a edição, depois das notícias e dos marcos históricos. É o espaço editorial assinado por Robson Santiago.
        </p>
        <label className="mt-5 block text-sm font-semibold">Título da análise
          <input className={field} maxLength={240} value={draft.commentary_title}
            placeholder="Ex.: O desafio de 2027: confiança e instabilidade"
            onChange={(e) => setDraft((cur) => ({ ...cur, commentary_title: e.target.value }))} />
        </label>
        <label className="mt-4 block text-sm font-semibold">Texto completo
          <textarea className={field} rows={12} maxLength={30000} value={draft.commentary_body}
            placeholder="Escreva a análise do comentarista para encerrar a edição..."
            onChange={(e) => setDraft((cur) => ({ ...cur, commentary_body: e.target.value }))} />
        </label>
        <p className="mt-2 text-xs text-[#71879a]">Assinatura exibida automaticamente: Robson Santiago.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#dbe5eb] bg-white p-5">
        <button type="button" disabled={saving} onClick={() => void save()} className={primary}>
          {saving ? "Salvando…" : "Salvar marcos e análise como rascunho"}
        </button>
        <span className="text-xs text-[#71879a]">Salvar não publica. Depois utilize “Aprovar e publicar edição”.</span>
      </div>
      {message ? <p role="status" className="rounded-xl bg-[#eef5fa] p-4 text-sm font-semibold text-[#25516f]">{message}</p> : null}
    </section>
  );
}
