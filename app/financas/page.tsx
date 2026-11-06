import type { Metadata } from "next";
import PanoramaPortal from "@/components/financas/PanoramaPortal";
import { readPanoramaData } from "@/lib/panorama/store";
import { readMarketIndicators } from "@/lib/panorama/market-store";
import type { MarketIndicator } from "@/lib/panorama/market";
import type { EditorialState } from "@/lib/panorama/editorial-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panorama 360° — Robson Santiago",
  description: "Brasil, mundo, economia e política. A notícia, o contexto e o que realmente importa.",
  robots: process.env.VERCEL_ENV === "production"
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default async function FinancasPage() {
  let initialData: EditorialState | undefined;
  let indicators: MarketIndicator[] = [];
  try {
    const [result, market] = await Promise.all([readPanoramaData(false), readMarketIndicators(false)]);
    indicators = market;
    initialData = {
      categories: result.categories,
      posts: result.posts.map((post) => ({
        id: post.id,
        title: post.title,
        categoryId: post.category_id,
        summary: post.summary,
        content: post.content,
        impact: post.impact,
        publishedAt: post.published_on,
        source: post.source,
        status: "Publicado" as const,
        featured: post.featured,
      })),
    };
  } catch {
    // The client shows an error and supports retry if the database is offline.
  }
  return <PanoramaPortal initialData={initialData} initialIndicators={indicators} />;
}
