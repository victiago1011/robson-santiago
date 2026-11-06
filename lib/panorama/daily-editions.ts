/**
 * Models the Panorama as an archive of daily editions, with one entry
 * for each editorial category that contains published news that day.
 * Public content only: drafts never reach the public reader.
 */
export type DailyNewsPost = {
  id: string;
  title: string;
  categoryId: string;
  publishedAt: string;
  status: "Rascunho" | "Publicado";
};

export type DailyCategory = { id: string; name: string };

export type DailyTopic<T extends DailyNewsPost> = {
  id: string;
  name: string;
  posts: T[];
};

export function publishedDays<T extends DailyNewsPost>(posts: readonly T[]): string[] {
  return [...new Set(
    posts.filter((post) => post.status === "Publicado" && /^\d{4}-\d{2}-\d{2}$/.test(post.publishedAt))
      .map((post) => post.publishedAt),
  )].sort((a, b) => b.localeCompare(a));
}

function categoryRank(name: string) {
  const normalized = name.toLocaleLowerCase("pt-BR");
  if (normalized === "brasil") return 0;
  if (normalized === "mundo") return 1;
  return 2;
}

/**
 * Maintains the order returned by the editorial store for articles inside
 * each category, displaying Brazil and World ahead of the other topics.
 * No category is hard-coded or shown without news.
 */
export function groupNewsByTopic<T extends DailyNewsPost>(
  posts: readonly T[],
  day: string,
  categories: readonly DailyCategory[],
): DailyTopic<T>[] {
  const groups = new Map<string, DailyTopic<T>>();
  const names = new Map(categories.map((category) => [category.id, category.name]));
  for (const post of posts) {
    if (post.status !== "Publicado" || post.publishedAt !== day) continue;
    const id = post.categoryId;
    let group = groups.get(id);
    if (!group) {
      group = { id, name: names.get(id) ?? "Outros assuntos", posts: [] };
      groups.set(id, group);
    }
    group.posts.push(post);
  }

  return Array.from(groups.values()).sort((left, right) =>
    categoryRank(left.name) - categoryRank(right.name)
    || left.name.localeCompare(right.name, "pt-BR"),
  );
}

export function topicSymbol(name: string): string {
  const label = name.toLocaleLowerCase("pt-BR");
  if (label.includes("brasil")) return "🇧🇷";
  if (label.includes("mundo") || label.includes("internacional") || label.includes("geopolítica")) return "🌎";
  if (label.includes("santa catarina") || label === "sc") return "SC";
  if (label.includes("economia") || label.includes("finança") || label.includes("mercado")) return "📈";
  if (label.includes("política")) return "🏛️";
  if (label.includes("tecnologia") || label.includes("inteligência artificial")) return "💻";
  if (label.includes("negócio") || label.includes("empresa")) return "💼";
  if (label.includes("agronegócio") || label.includes("agro")) return "🌾";
  return "📰";
}

/** Stable locale formatting avoids server/browser timezone mismatch. */
export function longEditionDate(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const date = new Date(day + "T12:00:00Z");
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(date);
}

export function shortEditionDate(day: string): { weekday: string; day: string; month: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { weekday: "", day, month: "" };
  const date = new Date(day + "T12:00:00Z");
  return {
    weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", ""),
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date).replace(".", ""),
  };
}

/**
 * Show sources once per topic instead of repeating identical references below
 * each short article. Distinct source lists remain separate (not silently
 * attributed to articles they may not support).
 */
export function uniqueTopicSources<T extends { source: string }>(posts: readonly T[]): string[] {
  const sources = new Map<string, string>();
  for (const post of posts) {
    const clean = post.source.trim().replace(/\s+/g, " ");
    if (clean && !sources.has(clean.toLocaleLowerCase("pt-BR"))) {
      sources.set(clean.toLocaleLowerCase("pt-BR"), clean);
    }
  }
  return [...sources.values()];
}
