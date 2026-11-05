export type BriefingPost = {
  id: string;
  title: string;
  summary: string;
  categoryId: string;
  publishedAt: string;
  featured: boolean;
  status: "Rascunho" | "Publicado";
};

/**
 * The briefing always represents the latest date with published material.
 * Editors can optionally flag relevant articles; other articles fill
 * remaining slots so a new edition never becomes empty.
 */
export function selectMinuteBriefing<T extends BriefingPost>(
  posts: readonly T[],
  maxItems = 5,
): { date: string; items: T[] } | null {
  const published = posts.filter((post) => post.status === "Publicado");
  if (!published.length) return null;
  const latestDate = published.reduce((latest, post) => (
    post.publishedAt > latest ? post.publishedAt : latest
  ), "");
  const dailyPosts = published.filter((post) => post.publishedAt === latestDate);
  const ordered = [
    ...dailyPosts.filter((post) => post.featured),
    ...dailyPosts.filter((post) => !post.featured),
  ];
  return { date: latestDate, items: ordered.slice(0, Math.max(0, maxItems)) };
}
