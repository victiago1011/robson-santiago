import assert from "node:assert/strict";
import { test } from "node:test";
import {
  describeEditorialValidation,
  editorialRequestSchema,
  resolveImpactVisibility,
} from "./editorial-validation";

const existingPost = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  title: "Lula prepara sinalização fiscal e mercado espera compromissos concretos",
  summary: "Resumo da notícia",
  content: "Texto integral da notícia",
  impact: "A credibilidade fiscal influencia juros e investimento.",
  source: "Panorama 360° — edição nº 003 (05/11/2026). Fontes gerais do documento.",
  published_on: "2026-11-05",
  status: "published" as const,
  featured: false,
};

test("edições existentes sem checkbox continuam válidas ao salvar", () => {
  const parsed = editorialRequestSchema.safeParse({ type: "post:upsert", post: existingPost });
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.data.type === "post:upsert") {
    assert.equal(parsed.data.post.show_impact, undefined);
  }
});

test("novo editor transmite checkbox booleano sem perder a preferência", () => {
  assert.equal(editorialRequestSchema.safeParse({
    type: "post:upsert", post: { ...existingPost, show_impact: false },
  }).success, true);
  assert.equal(resolveImpactVisibility(undefined, false, existingPost.impact), false);
  assert.equal(resolveImpactVisibility(undefined, true, existingPost.impact), true);
  assert.equal(resolveImpactVisibility(false, true, existingPost.impact), false);
  assert.equal(resolveImpactVisibility(true, false, existingPost.impact), true);
  assert.equal(resolveImpactVisibility(undefined, undefined, " "), false);
  assert.equal(resolveImpactVisibility(undefined, undefined, existingPost.impact), true);
});

test("importação antiga continua exclusivamente rascunho", () => {
  const post = { ...existingPost, status: "draft" as const };
  assert.equal(editorialRequestSchema.safeParse({ type: "posts:create", posts: [post] }).success, true);
  assert.equal(editorialRequestSchema.safeParse({
    type: "posts:create", posts: [existingPost],
  }).success, false);
});

test("campo inválido informa qual propriedade corrigir", () => {
  const parsed = editorialRequestSchema.safeParse({
    type: "post:upsert", post: { ...existingPost, title: "", show_impact: "yes" },
  });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const description = describeEditorialValidation(parsed.error);
    assert.match(description, /título/);
    assert.match(description, /exibição de Por que importa/);
  }
});
