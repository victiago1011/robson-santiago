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
      const rows = draft.agenda_items.filter((item) => item.text.trim());
      const payload = {
        published_on: day,
        agenda_items: rows,
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
      setMessage("Agenda e análise salvas como rascunho. Confira tudo antes de publicar esta edição.");
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
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#a17a3e]">Complementos da edição</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#143853]">🗓️ Agenda do Investidor</h3>
          </div>
          <span className={"rounded-full px-3 py-1 text-xs font-bold " + (draft.status === "published" ? "bg-[#e3f2e9] text-[#286b49]" : "bg-[#fff3dc] text-[#956c30]")}>
            {draft.status === "published" ? "Publicada" : "Rascunho"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#687f91]">
          Registre acontecimentos a acompanhar. A data é opcional: quando não houver dia confirmado,
          o site mostra “Em acompanhamento”, sem inventar datas no calendário.
        </p>
        <div className="mt-5 space-y-3">
          {draft.agenda_items.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-[#e2eaf0] bg-[#f8fbfd] p-4 md:grid-cols-[minmax(0,1fr)_160px_auto]">
              <label className="text-xs font-bold">Acontecimento
                <textarea rows={2} maxLength={500} className={field} value={item.text}
                  onChange={(event) => setDraft((cur) => ({
                    ...cur, agenda_items: cur.agenda_items.map((row, i) => i === index ? { ...row, text: event.target.value } : row),
                  }))} />
              </label>
              <label className="text-xs font-bold">Data (opcional)
                <input type="date" className={field} value={item.on ?? ""}
                  onChange={(event) => setDraft((cur) => ({
                    ...cur, agenda_items: cur.agenda_items.map((row, i) => i === index ? { ...row, on: event.target.value || null } : row),
                  }))} />
              </label>
              <button type="button" className="self-end rounded-lg border border-[#d9b9ac] px-4 py-3 text-xs font-bold text-[#8e4f3f]"
                onClick={() => setDraft((cur) => ({ ...cur, agenda_items: cur.agenda_items.filter((_, i) => i !== index) }))}>Excluir</button>
            </div>
          ))}
        </div>
        <button type="button" disabled={draft.agenda_items.length >= 30}
          className="mt-4 rounded-lg border border-[#b8ccd9] bg-white px-4 py-3 text-sm font-bold text-[#275f83] disabled:opacity-40"
          onClick={() => setDraft((cur) => ({ ...cur, agenda_items: [...cur.agenda_items, { text: "", on: null }] }))}>
          + Adicionar acontecimento
        </button>
      </div>

      <div className="rounded-2xl border border-[#dbe5eb] bg-white p-5 md:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#a17a3e]">Encerramento da edição</p>
        <h3 className="mt-2 text-xl font-extrabold text-[#143853]">✍️ A Visão do Comentarista</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#687f91]">
          Esta análise aparece depois de todas as notícias e da agenda. É o espaço editorial assinado por Robson Santiago.
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
          {saving ? "Salvando…" : "Salvar agenda e análise como rascunho"}
        </button>
        <span className="text-xs text-[#71879a]">Salvar não publica. Depois utilize “Aprovar e publicar edição”.</span>
      </div>
      {message ? <p role="status" className="rounded-xl bg-[#eef5fa] p-4 text-sm font-semibold text-[#25516f]">{message}</p> : null}
    </section>
  );
}
