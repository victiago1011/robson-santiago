import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCompleteEdition } from "./complete-edition-parser";

const categories = [
  { id: "br", name: "Brasil" }, { id: "world", name: "Mundo" },
  { id: "markets", name: "Economia & Mercados" },
  { id: "biz", name: "Negócios" },
];

test("edição 004: termômetro, agenda e opinião não viram matérias; países ficam no Mundo", () => {
  const raw = [
    "PANORAMA 360°",
    "SEXTA-FEIRA, 6 DE NOVEMBRO DE 2026",
    "📊 1. TERMÔMETRO ECONÔMICO",
    "Indicadores de referência — fechamento de 05/11/2026",
    "🇧🇷 Ibovespa: 166.191 pontos",
    "🇺🇸 Nasdaq Composite: queda de 5,5%",
    "Por que importa?",
    "Acompanhar juros é importante.",
    "🇧🇷 2. REFORMA TRIBUTÁRIA — O IMPOSTO DO PECADO E SEUS EFEITOS",
    "Texto sobre os tributos e seus efeitos.",
    "Por que importa?",
    "O preço final pode variar.",
    "🏛️ 3. LULA FALA EM RESPONSABILIDADE FISCAL — O MERCADO ESPERA MEDIDAS",
    "Medidas e propostas econômicas em discussão.",
    "🇺🇸 4. WALL STREET — A QUEDA DA NASDAQ E O ALERTA GLOBAL",
    "Variação de bolsas nos Estados Unidos.",
    "📉 5. GESTORES DE FUNDOS REDUZEM RISCOS — RECESSÃO EM 2027?",
    "Fundos avaliam volatilidade e riscos.",
    "🇫🇷 6. FRANÇA — PROTESTOS MOSTRAM O CUSTO SOCIAL DO AJUSTE FISCAL",
    "Protestos e o orçamento francês.",
    "🇵🇾 7. PARAGUAI — RENÚNCIA PRESIDENCIAL E CRISE BANCÁRIA",
    "Crise no sistema bancário paraguaio.",
    "🌍 8. GEOPOLÍTICA — GUERRA, ENERGIA E POLÍTICA AMERICANA",
    "Riscos geopolíticos internacionais.",
    "🗓️ 9. AGENDA DO INVESTIDOR — O QUE ACOMPANHAR",
    "Nas próximas semanas, os principais pontos de observação serão:",
    "1. O conteúdo do pronunciamento anunciado.",
    "2. A eventual apresentação de medidas fiscais.",
    "3. O câmbio e as expectativas de inflação.",
    "✍️ 10. A VISÃO DO COMENTARISTA",
    "O desafio de 2027: impostos, confiança e o preço da instabilidade",
    "Os acontecimentos desta semana trazem reflexões para investidores.",
    "A confiança nas instituições é importante.",
    "🌐 PANORAMA 360°",
    "Fontes de referência: veículos de imprensa.",
  ].join("\n");
  const parsed = parseCompleteEdition(raw, "2026-11-06", categories);
  assert.equal(parsed.posts.length, 7);
  assert.deepEqual(parsed.posts.map((post) => post.categoryId), ["br", "br", "world", "markets", "world", "world", "world"]);
  assert.ok(parsed.posts.every((post) => post.status === "Rascunho"));
  assert.equal(parsed.posts[0].showImpact, true);
  assert.equal(parsed.posts[1].showImpact, false);
  assert.equal(parsed.agenda.length, 3);
  assert.ok(parsed.agenda.every((item) => item.on === null));
  assert.match(parsed.commentaryTitle, /desafio de 2027/);
  assert.match(parsed.commentaryBody, /confiança nas instituições/);
  assert.ok(!parsed.posts.some((post) => /TERMÔMETRO|AGENDA|COMENTARISTA/.test(post.title)));
});

test("edição tradicional com cabeçalhos Brasil e Mundo continua organizada", () => {
  const raw = [
    "🇧🇷 BRASIL — ECONOMIA E POLÍTICA",
    "1. Banco Central e cenário de juros",
    "Texto econômico nacional.",
    "POR QUE IMPORTA?",
    "Análise de impacto.",
    "🌎 MUNDO — GEOPOLÍTICA E MERCADOS",
    "2. Relações internacionais e comércio",
    "Texto sobre o cenário externo.",
  ].join("\n");
  const parsed = parseCompleteEdition(raw, "2026-11-05", categories);
  assert.deepEqual(parsed.posts.map((post) => post.categoryId), ["br", "world"]);
  assert.equal(parsed.posts[0].showImpact, true);
  assert.equal(parsed.posts[1].showImpact, false);
});
