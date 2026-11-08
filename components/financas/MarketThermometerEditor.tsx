"use client";

import { useCallback, useEffect, useState } from "react";
import MarketIndicatorIcon from "@/components/financas/MarketIndicatorIcon";
import {
  indicatorMatches,
  marketDate,
  marketMovement,
  type MarketIndicator,
} from "@/lib/panorama/market";

const field = "mt-1.5 w-full min-w-0 rounded-lg border border-[#cbd7e1] bg-white px-3 py-2.5 text-sm text-[#19364d] outline-offset-2 focus-visible:outline-[#b98a3e]";

export default function MarketThermometerEditor({ dates = [] }: { dates?: string[] }) {
  const [editionDay, setEditionDay] = useState(() => dates[0] || new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()));
  const [items, setItems] = useState<MarketIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const [newIndicator, setNewIndicator] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setNotice("");
    try {
      const response = await fetch("/api/admin/panorama/market?date=" + encodeURIComponent(editionDay), { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar os indicadores.");
      const body = await response.json() as { indicators: MarketIndicator[] };
      setItems(body.indicators);
    } catch (err) {
      setFailed(true);
      setNotice(err instanceof Error ? err.message : "Erro ao carregar indicadores.");
    } finally {
      setLoading(false);
    }
  }, [editionDay]);

  useEffect(() => { void load(); }, [load]);

  function update(slug: string, patch: Partial<MarketIndicator>) {
    setNotice("");
    setItems((current) => current.map((item) => item.slug === slug ? { ...item, ...patch } : item));
  }

  async function createIndicator() {
    if (catalogBusy) return;
    const name = newIndicator.trim();
    if (name.length < 2 || name.length > 48) {
      setCatalogNotice("Informe um nome entre 2 e 48 caracteres.");
      return;
    }
    const already = items.find((item) => indicatorMatches(item.label, name));
    if (already) {
      setCatalogNotice("O indicador “" + already.label + "” já existe. Use Editar nome no card dele.");
      setEditingSlug(already.slug);
      setEditedName(already.label);
      document.getElementById("market-" + already.slug)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setCatalogBusy(true);
    setCatalogNotice("");
    try {
      const response = await fetch("/api/admin/panorama/market/catalog", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json() as { error?: string; existing?: string; slug?: string; label?: string };
      if (!response.ok) {
        if (data.existing) {
          const matching = items.find((item) => item.slug === data.existing);
          if (matching) { setEditingSlug(matching.slug); setEditedName(matching.label); }
        }
        throw new Error(data.error || "Não foi possível cadastrar.");
      }
      const slug = data.slug!;
      setItems((current) => [...current, {
        slug, label: data.label || name,
        display_order: Math.max(0, ...current.map((item) => item.display_order)) + 1,
        display_value: "", variation: "", direction: "flat", reference_on: null, visible: false,
      }]);
      setNewIndicator("");
      setCatalogNotice("Indicador “" + name + "” criado com ícone genérico. Preencha os valores para a edição selecionada.");
    } catch (err) {
      setCatalogNotice(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally { setCatalogBusy(false); }
  }

  async function renameIndicator(slug: string) {
    if (catalogBusy) return;
    const name = editedName.trim();
    if (name.length < 2 || name.length > 48) {
      setCatalogNotice("O nome deve ter de 2 a 48 caracteres.");
      return;
    }
    setCatalogBusy(true);
    setCatalogNotice("");
    try {
      const response = await fetch("/api/admin/panorama/market/catalog", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível editar.");
      setItems((current) => current.map((item) => item.slug === slug ? { ...item, label: name } : item));
      setEditingSlug(null);
      setCatalogNotice("Nome atualizado no catálogo e no histórico de todas as edições.");
    } catch (err) {
      setCatalogNotice(err instanceof Error ? err.message : "Falha ao renomear.");
    } finally { setCatalogBusy(false); }
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
        body: JSON.stringify({ edition_on: editionDay, indicators: items.map(({ slug, display_value, variation, direction, reference_on, visible }) => ({
          slug, display_value, variation, direction, reference_on, visible,
        })) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "Falha ao salvar.");
      }
      setNotice("Termômetro da edição de " + editionDay.split("-").reverse().join("/") + " salvo. Os cards visíveis aparecem somente nessa edição.");
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
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-[#b1833e]">Histórico por edição · Sem cotações automáticas</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#132f49] md:text-3xl">Termômetro econômico</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#5e7588]">
          Preencha os números, a variação e selecione ↑ alta, ↓ queda ou — neutro.
          A seta indica apenas o movimento — não se é uma notícia boa ou ruim.
          Para exibir um card nesta edição, marque <strong>Exibir no site</strong> e informe a data de referência do número (que pode ser o dia útil anterior).
        </p>
      </header>

      <section className="rounded-2xl border border-[#dce5ed] bg-white p-5 md:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#a17a3e]">Catálogo de indicadores</p>
        <h3 className="mt-2 text-xl font-extrabold text-[#143853]">+ Criar indicador personalizado</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#667d90]">
          Cadastre novos indicadores sem modificar os existentes. Nomes repetidos são bloqueados;
          cada novo indicador recebe um ícone genérico e começa oculto em todas as edições.
          Para alterar um nome, use “Editar nome” no card.
        </p>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => {
          event.preventDefault(); void createIndicator();
        }}>
          <label className="min-w-[220px] max-w-md flex-1 text-sm font-bold text-[#3a5970]">
            Nome do indicador
            <input className={field} value={newIndicator} maxLength={48}
              onChange={(event) => { setNewIndicator(event.target.value); setCatalogNotice(""); }}
              placeholder="Ex.: Petróleo Brent" />
          </label>
          <button disabled={catalogBusy} type="submit"
            className="min-h-11 rounded-xl bg-[#0b2a45] px-5 py-3 text-sm font-bold text-white hover:bg-[#1b4b6d] disabled:opacity-40">
            {catalogBusy ? "Salvando..." : "Adicionar indicador"}
          </button>
        </form>
        {catalogNotice ? <p role="status" className="mt-4 rounded-lg bg-[#f0f5f9] px-4 py-3 text-sm font-semibold text-[#315b78]">{catalogNotice}</p> : null}
      </section>

      <div className="rounded-2xl border border-[#dce5ed] bg-[#edf4f9] p-5">
        <label className="block max-w-xs text-sm font-extrabold text-[#244b66]">
          📅 Data da edição que você está editando
          <input type="date" className={field} value={editionDay} onChange={(e) => setEditionDay(e.target.value)} />
        </label>
        <p className="mt-3 text-sm text-[#55748a]">
          Os valores salvos pertencem exclusivamente à data acima. Escolher outro dia carrega os indicadores daquela edição, sem copiar as cotações atuais.
        </p>
        {dates.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">
          {dates.slice(0, 8).map((day) => <button type="button" key={day} onClick={() => setEditionDay(day)}
            className={"rounded-lg border px-3 py-2 text-xs font-semibold " + (day === editionDay ? "border-[#0b2a45] bg-[#0b2a45] text-white" : "border-[#b7ccdb] bg-white text-[#335d7c]")}>
            {day.split("-").reverse().join("/")}
          </button>)}
        </div> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const movement = marketMovement(item.direction);
          return (
            <div id={"market-" + item.slug} key={item.slug} className="scroll-mt-8 rounded-2xl border border-[#dce5ed] bg-white p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <MarketIndicatorIcon slug={item.slug} size="md" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#718699]">Indicador</p>
                    {editingSlug === item.slug ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input autoFocus aria-label="Novo nome do indicador" className={field}
                          maxLength={48} value={editedName} onChange={(event) => setEditedName(event.target.value)} />
                        <button type="button" disabled={catalogBusy} onClick={() => void renameIndicator(item.slug)}
                          className="rounded-lg bg-[#0b2a45] px-3 py-2 text-xs font-bold text-white">Salvar nome</button>
                        <button type="button" onClick={() => setEditingSlug(null)} className="rounded-lg border px-3 py-2 text-xs">Cancelar</button>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <h3 className="text-xl font-extrabold text-[#102f4b]">{item.label}</h3>
                        <button type="button" onClick={() => { setEditingSlug(item.slug); setEditedName(item.label); setCatalogNotice(""); }}
                          className="mt-1 text-xs font-bold text-[#2a6389] hover:underline">Editar nome</button>
                      </div>
                    )}
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
          {items.filter((item) => item.visible).length} de {items.length} indicadores selecionados para exibição.
        </p>
        <button disabled={saving || !items.length} type="button" onClick={() => void save()}
          className="min-h-11 rounded-xl bg-[#0b2a45] px-6 py-3 text-sm font-bold text-white hover:bg-[#1c4c70] disabled:opacity-50">
          {saving ? "Salvando…" : "Salvar termômetro econômico"}
        </button>
      </div>
      {notice ? <p role="status" className="rounded-xl border border-[#cfdde7] bg-[#eaf3f8] p-4 text-sm font-semibold text-[#214b68]">{notice}</p> : null}
    </section>
  );
}
