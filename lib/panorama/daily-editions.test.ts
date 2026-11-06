import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupNewsByTopic, longEditionDate, publishedDays, shortEditionDate, topicSymbol, uniqueTopicSources,
} from "./daily-editions";

const categories = [
  { id: "tech", name: "Tecnologia" },
  { id: "world", name: "Mundo" },
  { id: "br", name: "Brasil" },
  { id: "biz", name: "Empresas e Negócios" },
  { id: "sc", name: "Santa Catarina" },
];

type TestPost = { id: string; title: string; categoryId: string; publishedAt: string; status: "Publicado" | "Rascunho" };
const post = (id: string, categoryId: string, day = "2026-11-05", status: TestPost["status"] = "Publicado"): TestPost => ({
  id, title: id, categoryId, publishedAt: day, status,
});

test("datas das edições mostram somente dias publicados, mais recente primeiro, sem repetição", () => {
  const items = [
    post("1", "br", "2026-11-05"),
    post("2", "world", "2026-11-05"),
    post("3", "br", "2026-11-04"),
    post("4", "br", "2026-11-07", "Rascunho"),
  ];
  assert.deepEqual(publishedDays(items), ["2026-11-05", "2026-11-04"]);
});

test("Brasil é um único bloco com todas as notícias do dia; Mundo fica em outro", () => {
  const items = [
    post("1", "br"), post("2", "br"), post("3", "world"),
    post("4", "br", "2026-11-04"), post("5", "biz"),
    post("6", "sc"), post("7", "world"), post("8", "tech", "2026-11-05", "Rascunho"),
  ];
  const groups = groupNewsByTopic(items, "2026-11-05", categories);
  assert.deepEqual(groups.map((group) => group.name), ["Brasil", "Mundo", "Empresas e Negócios", "Santa Catarina"]);
  assert.deepEqual(groups.find((group) => group.name === "Brasil")?.posts.map((p) => p.id), ["1", "2"]);
  assert.deepEqual(groups.find((group) => group.name === "Mundo")?.posts.map((p) => p.id), ["3", "7"]);
  assert.equal(groups.some((group) => group.name === "Tecnologia"), false);
});

test("categorias criadas pelo ADM aparecem automaticamente com seus próprios assuntos", () => {
  const updated = [...categories, { id: "agro", name: "Agronegócio" }];
  assert.deepEqual(groupNewsByTopic([post("a", "agro")], "2026-11-05", updated).map((group) => group.name), ["Agronegócio"]);
  assert.equal(topicSymbol("Brasil"), "🇧🇷");
  assert.equal(topicSymbol("Santa Catarina"), "SC");
  assert.equal(topicSymbol("Mundo"), "🌎");
  assert.equal(topicSymbol("Tecnologia"), "💻");
  assert.equal(topicSymbol("Nova categoria"), "📰");
});

test("formatação das datas independe do fuso do navegador", () => {
  assert.match(longEditionDate("2026-11-05"), /5 de novembro de 2026/);
  assert.equal(shortEditionDate("2026-11-05").day, "05");
  assert.equal(shortEditionDate("2026-11-05").month, "nov");
});

test("fontes repetidas por notícia aparecem uma vez no rodapé do assunto", () => {
  const sources = uniqueTopicSources([
    { source: "Valor Econômico e Estadão" },
    { source: "  Valor  Econômico e Estadão   " },
    { source: "Folha de S.Paulo" },
    { source: " " },
  ]);
  assert.deepEqual(sources, ["Valor Econômico e Estadão", "Folha de S.Paulo"]);
});
