"use client";

import { useEffect, useRef, useState } from "react";

export type EditorialCategory = { id: string; name: string };
export type EditorialPost = {
  id: string;
  title: string;
  categoryId: string;
  summary: string;
  content: string;
  impact: string;
  publishedAt: string;
  status: "Rascunho" | "Publicado";
  source: string;
};
export type EditorialState = { categories: EditorialCategory[]; posts: EditorialPost[] };

type RawPanorama = {
  categories: EditorialCategory[];
  posts: Array<{
    id: string; title: string; category_id: string; summary: string; content: string;
    impact: string; source: string; published_on: string; status: "draft" | "published";
  }>;
};

function mapDbState(raw: RawPanorama): EditorialState {
  return {
    categories: raw.categories,
    posts: raw.posts.map((post) => ({
      id: post.id,
      title: post.title,
      categoryId: post.category_id,
      summary: post.summary,
      content: post.content,
      impact: post.impact,
      source: post.source,
      publishedAt: post.published_on,
      status: post.status === "published" ? "Publicado" : "Rascunho",
    })),
  };
}

function toDbPost(post: EditorialPost) {
  return {
    id: post.id,
    category_id: post.categoryId,
    title: post.title.trim(),
    summary: post.summary,
    content: post.content.trim(),
    impact: post.impact,
    source: post.source,
    published_on: post.publishedAt,
    status: post.status === "Publicado" ? "published" : "draft",
  };
}

export function usePanoramaContent(initial?: EditorialState) {
  const [data, setData] = useState<EditorialState>(initial ?? { categories: [], posts: [] });
  const [loading, setLoading] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const mode = typeof window !== "undefined" && window.location.pathname.startsWith("/admin/") ? "admin" : "public";

  const reload = async () => {
    try {
      const response = await fetch(mode === "admin" ? "/api/admin/panorama" : "/api/panorama", {
        cache: "no-store", credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Não foi possível carregar o Panorama 360°. Confira a conexão e o acesso administrativo.");
      const json = await response.json() as RawPanorama;
      setData(mapDbState(json));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os conteúdos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // Initial request only; other requests are triggered after writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCommand = async (payload: object) => {
    const response = await fetch("/api/admin/panorama", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error || "Não foi possível salvar a alteração.");
    }
  };

  const save = async (next: EditorialState) => {
    if (mode !== "admin") throw new Error("Edição indisponível para visitantes.");
    if (saving.current) throw new Error("Existe uma gravação em andamento.");
    saving.current = true;
    setBusy(true);
    try {
      const previous = data;
      const oldCategories = new Map(previous.categories.map((category) => [category.id, category]));
      const newCategories = new Map(next.categories.map((category) => [category.id, category]));
      const oldPosts = new Map(previous.posts.map((post) => [post.id, post]));
      const newPosts = new Map(next.posts.map((post) => [post.id, post]));

      for (const category of next.categories) {
        if (!oldCategories.has(category.id)) {
          await sendCommand({ type: "category:create", category });
        } else if (category.name !== oldCategories.get(category.id)?.name) {
          await sendCommand({ type: "category:update", category });
        }
      }
      for (const post of previous.posts) {
        if (!newPosts.has(post.id)) await sendCommand({ type: "post:delete", id: post.id });
      }

      const inserts = next.posts.filter((post) => !oldPosts.has(post.id));
      // Insert all the imported articles with one request. Supabase performs
      // one SQL INSERT statement, so errors do not partially insert the batch.
      for (let index = 0; index < inserts.length; index += 40) {
        await sendCommand({ type: "posts:create", posts: inserts.slice(index, index + 40).map(toDbPost) });
      }
      for (const post of next.posts) {
        const before = oldPosts.get(post.id);
        if (before && JSON.stringify(before) !== JSON.stringify(post)) {
          await sendCommand({ type: "post:upsert", post: toDbPost(post) });
        }
      }
      for (const category of previous.categories) {
        if (!newCategories.has(category.id)) {
          await sendCommand({ type: "category:delete", id: category.id });
        }
      }
      await reload();
    } catch (cause) {
      await reload();
      throw cause;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  return { data, save, loading, busy, error, reload, mode };
}

export function formatEditorialDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-");
  return day + "/" + month + "/" + year;
}

export function uniqueCategoryName(categories: EditorialCategory[], name: string, excludeId?: string) {
  const normalized = name.trim().toLocaleLowerCase("pt-BR");
  return normalized.length > 0 && !categories.some((item) => item.id !== excludeId && item.name.trim().toLocaleLowerCase("pt-BR") === normalized);
}

export function parsePanoramaText(raw: string, date: string, categories: EditorialCategory[]): EditorialPost[] {
  let activeCategory = "Brasil";
  let current: { title: string; body: string[]; impact: string[]; inImpact: boolean; category: string } | null = null;
  const parsed: Array<{ title: string; body: string[]; impact: string[]; category: string }> = [];

  const flush = () => {
    if (current && (current.body.length || current.impact.length)) {
      parsed.push({ title: current.title, body: current.body, impact: current.impact, category: current.category });
    }
    current = null;
  };

  for (const textLine of raw.split(/\r?\n/)) {
    const line = textLine.trim();
    if (!line) continue;
    const upper = line.toLocaleUpperCase("pt-BR");

    if (/AGENDA\s*[—–-]|HISTÓRIA E MEMÓRIA|A VISÃO DO COMENTARISTA|^FONTES\s*:/.test(upper)) {
      flush();
      if (/AGENDA\s*[—–-]|HISTÓRIA E MEMÓRIA|A VISÃO DO COMENTARISTA/.test(upper)) break;
      continue;
    }

    if (line.length < 95 && upper === line && /BRASIL\s*[—–-]|MUNDO\s*[—–-]|EMPRESAS,? NEGÓCIOS|SANTA CATARINA/.test(upper)) {
      flush();
      if (upper.includes("MUNDO")) activeCategory = "Mundo";
      else if (upper.includes("EMPRESAS")) activeCategory = "Negócios";
      else if (upper.includes("SANTA CATARINA")) activeCategory = "Santa Catarina";
      else activeCategory = "Brasil";
      continue;
    }

    const heading = line.match(/^(\d{1,2})\.\s+(.{8,})$/);
    if (heading) {
      flush();
      current = { title: heading[2].trim(), body: [], impact: [], inImpact: false, category: activeCategory };
      continue;
    }
    if (!current) continue;

    if (/^POR QUE IMPORTA\s*\??$/i.test(line)) {
      current.inImpact = true;
      continue;
    }
    if (current.inImpact) current.impact.push(line);
    else current.body.push(line);
  }
  flush();

  return parsed.map((item, index) => ({
    id: crypto.randomUUID(),
    title: item.title,
    categoryId: categories.find((c) => c.name === item.category)?.id || categories[0]?.id || "cat-0",
    summary: item.body[0]?.slice(0, 240) || "",
    content: item.body.join("\n\n"),
    impact: item.impact.join("\n\n"),
    publishedAt: date,
    status: "Rascunho",
    source: "Texto importado para revisão — notícia " + (index + 1),
  }));
}
