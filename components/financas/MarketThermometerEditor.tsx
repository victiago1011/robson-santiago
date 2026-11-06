"use client";

import { useCallback, useEffect, useState } from "react";
import MarketIndicatorIcon from "@/components/financas/MarketIndicatorIcon";
import {
  MARKET_SLUGS,
  marketDate,
  marketMovement,
  type MarketIndicator,
} from "@/lib/panorama/market";

const field = "mt-1.5 w-full min-w-0 rounded-lg border border-[#cbd7e1] bg-white px-3 py-2.5 text-sm text-[#19364d] outline-offset-2 focus-visible:outline-[#b98a3e]";

export default function MarketThermometerEditor() {
  const [items, setItems] = useState<MarketIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setNotice("");
    try {
      const response = await fetch("/api/admin/panorama/market", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar os indicadores.");
      const body = await response.json() as { indicators: MarketIndicator[] };
      setItems(body.indicators);
    } catch (err) {
      setFailed(true);
      setNotice(err instanceof Error ? err.message : "Erro ao carregar indicadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function update(slug: string, patch: Partial<MarketIndicator>) {
    setNotice("");
    setItems((current) => current.map((item) => item.slug === slug ? { ...item, ...patch } : item));
  }

  async function save() {
    if (saving) return;
    const invalid = items.find((item) => item.visible && (!item.display_value.trim() || !item.reference_on));
    if (invalid) {
      setNotice("Preencha o valor e a data de referência de " + invalid.label + " antes de exibir.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/panorama/market", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indicators: items.map(({ slug, display_value, variation, direction, reference_on, visible }) => ({
          slug, display_value, variation, direction, reference_on, visible,
        })) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "Falha ao salvar.");
      }
      setNotice("Termômetro atualizado com sucesso. Os indicadores visíveis já aparecem na página de Finanças.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div role="status" className="rounded-2xl border border-[#dce5ed] bg-white p-8 text-sm text-[#567186]">Carregando termômetro econômico…</div>;
  if (failed) return <div role="alert" className="rounded-2xl border border-[#ead6b9] bg-[#fff9ec] p-7 text-sm text-[#754b29]">
    <p>{notice}</p><button type="button" className="mt-4 rounded-lg bg-[#0b2a45] px-5 py-3 font-bold text-white" onClick={() => void load()}>Tentar novamente</button>
  </div>;

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-[#dce5ed] bg-white p-6 md:p-8">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-[#b1833e]">Edição manual · Sem cotações automáticas</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#132f49] md:text-3xl">Termômetro econômico</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5e7588]">
          Preencha os números, a variação e selecione ↑ alta, ↓ queda ou — neutro.
          A seta indica apenas o movimento — não se é uma notícia boa ou ruim.
          Para publicar um card, marque <strong>Exibir no site</strong> e informe a data de referência.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const movement = marketMovement(item.direction);
          return (
            <div key={item.slug} className="rounded-2xl border border-[#dce5ed] bg-white p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <MarketIndicatorIcon slug={item.slug} size="md" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#718699]">Indicador</p>
                    <h3 className="mt-1 text-xl font-extrabold text-[#102f4b]">{item.label}</h3>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-[#31546e]">
                  <input type="checkbox" checked={item.visible} onChange={(e) => update(item.slug, { visible: e.target.checked })}
                    className="h-4 w-4 accent-[#0b2a45]" />
                  Exibir no site
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#4d6479]">Valor exibido
                  <input value={item.display_value} maxLength={48} onChange={(e) => update(item.slug, { display_value: e.target.value })}
                    placeholder="Ex.: R$ 5,45" className={field} />
                </label>
                <label className="text-xs font-bold text-[#4d6479]">Variação (opcional)
                  <input value={item.variation} maxLength={32} onChange={(e) => update(item.slug, { variation: e.target.value })}
                    placeholder="Ex.: 0,64%" className={field} />
                </label>
                <label className="text-xs font-bold text-[#4d6479]">Direção da seta
                  <select value={item.direction} onChange={(e) => update(item.slug, { direction: e.target.value as MarketIndicator["direction"] })}
                    className={field}>
                    <option value="up">▲ Alta</option><option value="down">▼ Queda</option><option value="flat">— Neutro / sem indicação</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[#4d6479]">Data de referência
                  <input type="date" value={item.reference_on || ""} onChange={(e) => update(item.slug, { reference_on: e.target.value || null })}
                    className={field} />
                </label>
              </div>
              <div className="mt-5 rounded-xl border border-[#e2e9ee] bg-[#f5f8fa] p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#708699]">Prévia do card</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-3">
                  <strong className="text-xl text-[#13324a]">{item.display_value || "Valor não informado"}</strong>
                  <span className={"text-sm font-bold " + movement.color}
                    aria-label={item.direction === "flat" ? "Variação neutra ou não informada" : movement.label + (item.variation ? ": " + item.variation : "")}>
                    <span aria-hidden="true">{movement.symbol}</span>
                    {item.direction !== "flat" && item.variation.trim() ? " " + item.variation : null}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#70849a]">
                  {item.reference_on ? "Referência: " + marketDate(item.reference_on) : "Informe a data de referência"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce5ed] bg-white p-5">
        <p className="text-sm text-[#647a8e]">
          {items.filter((item) => item.visible).length} de {MARKET_SLUGS.length} indicadores selecionados para exibição.
        </p>
        <button disabled={saving || items.length !== MARKET_SLUGS.length} type="button" onClick={() => void save()}
          className="min-h-11 rounded-xl bg-[#0b2a45] px-6 py-3 text-sm font-bold text-white hover:bg-[#1c4c70] disabled:opacity-50">
          {saving ? "Salvando…" : "Salvar termômetro econômico"}
        </button>
      </div>
      {notice ? <p role="status" className="rounded-xl border border-[#cfdde7] bg-[#eaf3f8] p-4 text-sm font-semibold text-[#214b68]">{notice}</p> : null}
    </section>
  );
}
