"use client";

import { useEffect, useState } from "react";
import type { ParsedPanorama } from "@/lib/panorama/plain-edition";
import { parseThermometer, updateThermometerBody } from "@/lib/panorama/thermometer";
import { TextThermometer } from "@/components/financas/PanoramaTextPortal";

type Props = {
  date: string;
  text: string;
  parsed: ParsedPanorama;
  onTextChange: (text: string) => void;
  requireReading: boolean;
  onRequireReading: (value: boolean) => void;
  requireHistory: boolean;
  onRequireHistory: (value: boolean) => void;
};

const statusColor = (present: boolean, required: boolean) =>
  present ? "text-[#28634a]" : required ? "text-[#a55d2b]" : "text-[#6f8394]";

export default function PanoramaEditorialReview({
  date, text, parsed, onTextChange, requireReading, onRequireReading, requireHistory, onRequireHistory,
}: Props) {
  const thermometer = parsed.thermometer ? parseThermometer(parsed.thermometer.body) : null;
  const [editingThermometer, setEditingThermometer] = useState(false);
  const [draftThermometer, setDraftThermometer] = useState(parsed.thermometer?.body || "");
  useEffect(() => {
    if (!editingThermometer) setDraftThermometer(parsed.thermometer?.body || "");
  }, [parsed.thermometer?.body, editingThermometer]);

  const opening = Boolean(parsed.opening?.body.trim());
  const history = Boolean(parsed.history?.body.trim());
  const indicators = (thermometer?.groups || []).reduce((n, group) => n + group.metrics.length, 0);
  const statuses = [
    { name: "Data da edição", present: parsed.date === date, required: true, detail: parsed.date || "Não identificada no TXT" },
    { name: "Abertura", present: opening, required: false, detail: opening ? "Reconhecida" : "Não encontrada ou sem texto" },
    { name: "Termômetro econômico", present: indicators > 0, required: false, detail: indicators + " indicadores reconhecidos" },
    { name: "Leitura do mercado", present: Boolean(thermometer?.hasReading), required: requireReading, detail: requireReading ? "Obrigatória nesta revisão" : "Opcional" },
    { name: "Notícias", present: parsed.news.length > 0, required: true, detail: parsed.news.length + " itens (sem número fixo)" },
    { name: "Visão do Comentarista", present: Boolean(parsed.commentary?.body.trim()), required: false, detail: "Se presente, fica separada no final" },
    { name: "Marcos históricos desta data", present: history, required: requireHistory, detail: requireHistory ? "Obrigatórios nesta revisão" : "Opcionais" },
    { name: "Fontes e referências", present: Boolean(parsed.sources.trim()), required: false, detail: "Uma seção ao final" },
  ];
  const prependBefore = (pattern: RegExp, insertion: string) => {
    const match = pattern.exec(text);
    if (match && match.index !== undefined) {
      const before = text.slice(0, match.index).trimEnd();
      const after = text.slice(match.index).trimStart();
      onTextChange(before + "\n\n" + insertion + "\n\n⸻\n\n" + after);
    } else {
      onTextChange(text.trimEnd() + "\n\n⸻\n\n" + insertion + "\n");
    }
  };

  return (
    <section aria-label="Conferência editorial antes de publicar" className="mt-6 rounded-2xl border border-[#dce5ed] bg-[#f8fafc] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-extrabold text-[#153955]">Conferência da edição</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#657f92]">
            O que foi encontrado no TXT e o que ainda pode ser ajustado. As partes opcionais não são inventadas nem publicadas vazias.
          </p>
        </div>
        <span className="rounded-lg border border-[#dce6ef] bg-white px-3 py-1 text-xs font-semibold text-[#637e91]">
          {statuses.filter((item) => item.present).length} de {statuses.length} identificados
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {statuses.map((item) => (
          <div key={item.name} className="rounded-xl border border-[#e0e8ef] bg-white px-3 py-3">
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className={"text-sm font-black " + statusColor(item.present, item.required)}>
                {item.present ? "✓" : item.required ? "!" : "—"}
              </span>
              <div className="min-w-0">
                <p className="text-[0.82rem] font-bold text-[#213e54]">{item.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-[#6c8295]">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce5ed] bg-white p-3 text-sm">
          <input type="checkbox" checked={requireReading} onChange={(e) => onRequireReading(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#0d3958]" />
          <span><strong>Exigir leitura do mercado</strong>
            <span className="mt-1 block text-xs leading-relaxed text-[#6a8295]">Se marcado, impede a publicação até que a leitura seja preenchida.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dce5ed] bg-white p-3 text-sm">
          <input type="checkbox" checked={requireHistory} onChange={(e) => onRequireHistory(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#0d3958]" />
          <span><strong>Exigir marcos históricos</strong>
            <span className="mt-1 block text-xs leading-relaxed text-[#6a8295]">Inclua somente fatos comprovados da data, com fontes. Não confundir com matérias de história econômica.</span>
          </span>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!opening && !parsed.opening ? (
          <button type="button" onClick={() => prependBefore(/^[^\n]*\d{1,3}\.\s+TERMÔMETRO ECONÔMICO\s*$/imu, "📌 ABERTURA DO DIA")}
            className="rounded-lg border border-[#c4d5e2] bg-white px-3 py-2 text-xs font-bold text-[#2b5b7b] hover:bg-[#eaf2f8]">
            + Inserir título de abertura
          </button>
        ) : null}
        {!thermometer?.hasReading && parsed.thermometer ? (
          <button type="button" onClick={() => {
            onTextChange(updateThermometerBody(text, parsed.thermometer!.body.trimEnd() + "\n\n🔎 LEITURA DO MERCADO\n"));
            setEditingThermometer(true);
          }} className="rounded-lg border border-[#c4d5e2] bg-white px-3 py-2 text-xs font-bold text-[#2b5b7b] hover:bg-[#eaf2f8]">
            + Inserir título de leitura do mercado
          </button>
        ) : null}
        {!parsed.history ? (
          <button type="button" onClick={() => prependBefore(
            /^[^\n]*\d{1,3}\.\s+A VISÃO DO COMENTARISTA.*$/imu,
            "📜 MARCOS HISTÓRICOS DESTA DATA",
          )} className="rounded-lg border border-[#c4d5e2] bg-white px-3 py-2 text-xs font-bold text-[#2b5b7b] hover:bg-[#eaf2f8]">
            + Inserir título de marcos históricos
          </button>
        ) : null}
      </div>
      {parsed.thermometer ? (
        <div className="mt-5 border-t border-[#dde7ee] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-extrabold text-[#153955]">Termômetro econômico</h4>
            <button type="button" onClick={() => {
              if (!editingThermometer) setDraftThermometer(parsed.thermometer?.body || "");
              setEditingThermometer(!editingThermometer);
            }} className="rounded-lg border border-[#bfcfda] bg-white px-4 py-2 text-xs font-bold text-[#315d7d] hover:bg-[#eff5fa]">
              {editingThermometer ? "Fechar editor" : "✎ Editar indicadores, referências e leitura"}
            </button>
          </div>
          {editingThermometer ? (
            <div className="mt-3 rounded-xl border border-[#d5e1eb] bg-white p-4">
              <p className="text-xs leading-relaxed text-[#637e91]">
                Edite diretamente os nomes e valores na forma “• Indicador: valor”. Separe grupos com “🇧🇷 BRASIL” ou “🌎 MERCADOS INTERNACIONAIS”. Escreva a análise abaixo de “🔎 LEITURA DO MERCADO”.
              </p>
              <textarea value={draftThermometer} onChange={(e) => setDraftThermometer(e.target.value)}
                aria-label="Editar texto completo do termômetro" rows={14}
                className="mt-3 block w-full rounded-xl border border-[#c7d7e3] bg-[#fbfdff] p-3 font-mono text-xs leading-[1.7] text-[#12334e] focus-visible:outline-2 focus-visible:outline-[#ab8647]" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => {
                  onTextChange(updateThermometerBody(text, draftThermometer));
                  setEditingThermometer(false);
                }} className="rounded-lg bg-[#0b2a45] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#194c70]">
                  Aplicar alterações no TXT
                </button>
                <button type="button" onClick={() => { setDraftThermometer(parsed.thermometer?.body || ""); setEditingThermometer(false); }}
                  className="rounded-lg border border-[#c5d4e1] px-4 py-2.5 text-xs font-bold text-[#315d7d]">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="min-w-0"><TextThermometer section={parsed.thermometer} /></div>
          )}
        </div>
      ) : null}
      {parsed.opening && !opening ? (
        <p className="mt-4 text-xs font-semibold text-[#a55d2b]">O título da abertura foi encontrado, mas ainda falta preencher o texto abaixo dele.</p>
      ) : null}
      {parsed.history && !history ? (
        <p className="mt-2 text-xs font-semibold text-[#a55d2b]">O título de marcos históricos foi criado, mas ainda está sem acontecimentos. Preencha no TXT ou mantenha a seção opcional.</p>
      ) : null}
    </section>
  );
}
