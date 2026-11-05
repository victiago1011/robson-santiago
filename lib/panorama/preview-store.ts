"use client";

import { useEffect, useState } from "react";
import { panoramaNews } from "@/lib/panorama/demo";

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

const STORAGE_KEY = "robson-panorama-360-editorial-preview-v2";
const DEFAULT_CATEGORY_NAMES = [
  "Brasil", "Mundo", "Economia & Mercados", "Política", "Tecnologia", "Negócios", "Santa Catarina",
];

export const initialEditorialState: EditorialState = {
  categories: DEFAULT_CATEGORY_NAMES.map((name, i) => ({ id: "cat-" + i, name })),
  posts: panoramaNews.map((news, index) => ({
    id: "exemplo-" + news.slug,
    title: news.title,
    categoryId: "cat-" + Math.max(0, DEFAULT_CATEGORY_NAMES.indexOf(news.category)),
    summary: news.description,
    content: news.body.join("\n\n"),
    impact: news.impact,
    publishedAt: index < 3 ? "2026-11-05" : index < 5 ? "2026-11-04" : "2026-11-03",
    status: "Publicado" as const,
    source: "Conteúdo de demonstração da edição 003 — checagem pendente",
  })),
};

function isValidState(input: unknown): input is EditorialState {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<EditorialState>;
  return Array.isArray(value.categories) && Array.isArray(value.posts)
    && value.categories.every((c) => c && typeof c.id === "string" && typeof c.name === "string")
    && value.posts.every((p) => p && typeof p.id === "string" && typeof p.title === "string" && typeof p.categoryId === "string"
      && typeof p.publishedAt === "string" && (p.status === "Rascunho" || p.status === "Publicado"));
}

function readPreview(): EditorialState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialEditorialState;
    const parsed: unknown = JSON.parse(saved);
    return isValidState(parsed) ? parsed : initialEditorialState;
  } catch {
    return initialEditorialState;
  }
}

export function useEditorialPreview() {
  const [data, setData] = useState<EditorialState>(initialEditorialState);
  useEffect(() => {
    const sync = () => setData(readPreview());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("panorama-demo-update", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("panorama-demo-update", sync);
    };
  }, []);

  const save = (next: EditorialState) => {
    setData(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("panorama-demo-update"));
    } catch {
      // Prototipagem sem persistência quando o navegador bloqueia armazenamento.
    }
  };

  return { data, save };
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
    id: "import-" + crypto.randomUUID(),
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
