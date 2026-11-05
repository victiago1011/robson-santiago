import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePanoramaText, uniqueCategoryName } from "./editorial-client";

const categories = [
  { id: "a", name: "Brasil" },
  { id: "b", name: "Mundo" },
  { id: "c", name: "Negócios" },
  { id: "d", name: "Santa Catarina" },
];

test("importação reconhece matérias numeradas, categorias e Por que importa", () => {
  const raw = [
    "PANORAMA 360°",
    "🇧🇷 BRASIL — ECONOMIA E POLÍTICA",
    "1. Banco Central e o cenário de juros",
    "A política monetária e a economia continuam em discussão.",
    "POR QUE IMPORTA?",
    "Os juros influenciam crédito e investimentos.",
    "2. Empresas e planejamento financeiro",
    "Fluxo de caixa e gestão exigem acompanhamento.",
    "POR QUE IMPORTA?",
    "A gestão previne riscos.",
    "🌎 MUNDO — GEOPOLÍTICA E MERCADOS",
    "3. Mercado internacional e comércio global",
    "Os eventos mundiais impactam os negócios.",
    "POR QUE IMPORTA?",
    "O comércio internacional afeta preços.",
    "📅 AGENDA — O QUE ACOMPANHAR",
    "10/11, terça — exemplo de evento",
  ].join("\n");
  const posts = parsePanoramaText(raw, "2026-11-05", categories);
  assert.equal(posts.length, 3);
  assert.equal(posts[0].categoryId, "a");
  assert.equal(posts[1].categoryId, "a");
  assert.equal(posts[2].categoryId, "b");
  assert.equal(posts[0].status, "Rascunho");
  assert.match(posts[0].impact, /juros influenciam/);
  assert.match(posts[2].content, /eventos mundiais/);
  assert.ok(posts.every((post) => /^[0-9a-f-]{36}$/.test(post.id)));
  assert.ok(posts.every((post) => post.publishedAt === "2026-11-05"));
  assert.ok(posts.every((post) => !post.content.includes("10/11")));
});

test("importação sem títulos numerados não cria matérias espúrias", () => {
  const posts = parsePanoramaText("Panorama de mercado\nTexto introdutório", "2026-11-05", categories);
  assert.deepEqual(posts, []);
});

test("categoria duplicada ignora capitalização e espaços; renomeação preserva o mesmo id", () => {
  assert.equal(uniqueCategoryName(categories, "  BRASIL "), false);
  assert.equal(uniqueCategoryName(categories, "Tecnologia"), true);
  assert.equal(uniqueCategoryName(categories, "brasil", "a"), true);
});
