import assert from "node:assert/strict";
import { test } from "node:test";
import { ROBSON_PANORAMA_PROMPT } from "./editorial-prompt";
import { parseCompleteEdition } from "./complete-edition-parser";

const categories = [
  { id: "br", name: "Brasil" },
  { id: "world", name: "Mundo" },
  { id: "biz", name: "Negócios" },
  { id: "sc", name: "Santa Catarina" },
];

test("prompt do ChatGPT Plus mantém estrutura compatível com importador", () => {
  const section = ROBSON_PANORAMA_PROMPT.split("PANORAMA 360° — EDIÇÃO DE DD/MM/AAAA")[1]
    ?.split("IMPORTANTE:")[0];
  assert.ok(section, "O prompt precisa fornecer modelo claro");
  const sample = "PANORAMA 360° — EDIÇÃO DE 05/11/2026" + section;
  const edition = parseCompleteEdition(sample, "2026-11-05", categories);
  assert.equal(edition.posts.length, 5);
  assert.deepEqual(edition.posts.map((post) => post.categoryId), ["br", "br", "world", "biz", "sc"]);
  assert.equal(edition.posts[0].showImpact, true);
  assert.equal(edition.posts[1].showImpact, false);
  assert.match(edition.commentaryTitle, /Título original/);
  assert.match(edition.commentaryBody, /minha análise/);
});

test("instruções proíbem repetir abertura e exigem fontes verificáveis e revisão manual", () => {
  assert.match(ROBSON_PANORAMA_PROMPT, /NÃO duplique informação/);
  assert.match(ROBSON_PANORAMA_PROMPT, /FONTES DE REFERÊNCIA:/);
  assert.match(ROBSON_PANORAMA_PROMPT, /PENDENTE DE VERIFICAÇÃO/);
  assert.match(ROBSON_PANORAMA_PROMPT, /Marcos Históricos também são cadastrados separadamente/);
});
