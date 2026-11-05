import assert from "node:assert/strict";
import { test } from "node:test";
import { selectMinuteBriefing } from "./briefing";

type BriefItem = Parameters<typeof selectMinuteBriefing>[0][number];
function news(id: number, publishedAt: string, featured = false, status: BriefItem["status"] = "Publicado"): BriefItem {
  return { id: String(id), title: "Notícia " + id, summary: "", categoryId: "brasil", publishedAt, featured, status };
}

test("resumo de 60 segundos usa somente a data de publicação mais recente", () => {
  const items = [news(1, "2026-11-04", true), news(2, "2026-11-05"), news(3, "2026-11-05")];
  const digest = selectMinuteBriefing(items);
  assert.equal(digest?.date, "2026-11-05");
  assert.deepEqual(digest?.items.map((item) => item.id), ["2", "3"]);
});

test("matérias destacadas têm prioridade sem exigir trabalho editorial extra", () => {
  const items = [news(1, "2026-11-05"), news(2, "2026-11-05", true), news(3, "2026-11-05")];
  assert.deepEqual(selectMinuteBriefing(items)?.items.map((item) => item.id), ["2", "1", "3"]);
});

test("resumo limita cinco assuntos, ignora rascunhos e não inventa conteúdo", () => {
  const items = Array.from({ length: 8 }, (_, i) => news(i + 1, "2026-11-05"));
  items.push(news(99, "2026-11-06", true, "Rascunho"));
  assert.equal(selectMinuteBriefing(items)?.items.length, 5);
  assert.equal(selectMinuteBriefing(items)?.date, "2026-11-05");
  assert.equal(selectMinuteBriefing([news(7, "2026-11-05", false, "Rascunho")]), null);
  assert.equal(selectMinuteBriefing([]), null);
});
