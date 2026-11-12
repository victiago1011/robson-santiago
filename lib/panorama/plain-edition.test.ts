import { strict as assert } from "node:assert";
import { test } from "node:test";
import { editionDateFromText, parsePanoramaEdition, splitImpact } from "./plain-edition";

test("lê data por extenso, abertura, emojis, termômetro e análise sem número fixo", () => {
  const example = [
    "🌐 PANORAMA 360°", "QUINTA-FEIRA, 12 DE NOVEMBRO DE 2026", "⸻",
    "📌 ABERTURA — UMA LEITURA DO DIA", "Texto introdutório.", "⸻",
    "📊 1. TERMÔMETRO ECONÔMICO", "💵 Dólar: R$ 5,56 | -0,43%", "⸻",
    "🇧🇷 2. PACOTE FISCAL — BRASIL", "O governo anunciou medidas.",
    "1. Contenção de despesas: exemplo interno.", "💡 POR QUE IMPORTA?",
    "Acompanhar os juros.", "⸻", "🇺🇸 3. ESTADOS UNIDOS — JUROS",
    "A política monetária muda.", "⸻",
    "✍️ 21. A VISÃO DO COMENTARISTA", "O futuro depende da confiança.",
    "1. Credibilidade fiscal: fundamental.", "Robson Santiago",
    "40 anos de experiência no mercado financeiro", "⸻",
    "FONTES — EDIÇÕES DE 12/11/2026", "Valor Econômico; Agência Brasil.",
  ].join("\n");
  const result = parsePanoramaEdition(example);
  assert.equal(result.date, "2026-11-12");
  assert.equal(result.opening?.title, "ABERTURA — UMA LEITURA DO DIA");
  assert.equal(result.thermometer?.body, "💵 Dólar: R$ 5,56 | -0,43%");
  assert.equal(result.news.length, 2);
  assert.match(result.news[0].body, /Contenção de despesas/);
  assert.equal(result.news[0].icon, "🇧🇷");
  assert.equal(result.commentary?.number, 21);
  assert.match(result.commentary?.body || "", /Credibilidade fiscal/);
  assert.doesNotMatch(result.commentary?.body || "", /40 anos de experiência/);
  assert.match(result.sources, /Valor Econômico/);
  assert.equal(splitImpact(result.news[0].body).impact, "Acompanhar os juros.");
});

test("item 16 também é separado; listas numeradas dentro da análise são preservadas", () => {
  const text = ["📅 Quarta-feira, 11 de novembro de 2026", "📰 ABERTURA DO DIA",
    "O BRASIL ENTRE OS JUROS E O MERCADO", "Abertura de teste.", "⸻",
    "📊 1. TERMÔMETRO ECONÔMICO", "Dados do dia", "⸻",
    "🇧🇷 2. ASSUNTO BRASILEIRO", "Texto.", "⸻",
    "✍️ 16. A VISÃO DO COMENTARISTA", "TÍTULO DA ANÁLISE",
    "1. Política fiscal.", "2. Crédito.", "⸻", "Fontes editoriais: imprensa."].join("\n");
  const r = parsePanoramaEdition(text);
  assert.equal(r.date, "2026-11-11");
  assert.equal(r.opening?.title, "O BRASIL ENTRE OS JUROS E O MERCADO");
  assert.equal(r.news.length, 1);
  assert.equal(r.commentary?.number, 16);
  assert.match(r.commentary?.body || "", /2. Crédito/);
  assert.equal(r.sources, "Fontes editoriais: imprensa.");
});

test("data inválida não é aceita e não há conteúdo inventado", () => {
  assert.equal(editionDateFromText("31 DE FEVEREIRO DE 2026"), null);
  const p = parsePanoramaEdition("Texto sem títulos numerados ou autoria");
  assert.equal(p.news.length, 0);
  assert.equal(p.commentary, null);
  assert.equal(p.date, null);
});
