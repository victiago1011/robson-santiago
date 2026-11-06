import type { Metadata } from "next";
import PanoramaPortal from "@/components/financas/PanoramaPortal";
import { readPanoramaData } from "@/lib/panorama/store";
import { readMarketIndicators } from "@/lib/panorama/market-store";
import type { MarketIndicator } from "@/lib/panorama/market";
import { readEditionExtras } from "@/lib/panorama/edition-store";
import type { EditionExtras } from "@/lib/panorama/edition-extras";
import type { EditorialState } from "@/lib/panorama/editorial-client";

export const dynamic = "force-dynamic";

const panoramaTitle = "Panorama 360° — Robson Santiago";
const panoramaDescription = "Brasil, mundo, economia e política. A notícia, o contexto e o que realmente importa.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.robsonsantiago.com.br"),
  title: panoramaTitle,
  description: panoramaDescription,
  alternates: { canonical: "/financas" },
  openGraph: {
    title: panoramaTitle,
    description: panoramaDescription,
    siteName: "Robson Santiago",
    url: "/financas",
    type: "website",
    locale: "pt_BR",
    images: [{
      url: "/financas/opengraph-image",
      width: 1200,
      height: 630,
      alt: "Panorama 360° — Brasil, Mundo, Economia e Política",
      type: "image/png",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: panoramaTitle,
    description: panoramaDescription,
    images: ["/financas/opengraph-image"],
  },
  robots: process.env.VERCEL_ENV === "production"
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default async function FinancasPage() {
  let initialData: EditorialState | undefined;
  let indicators: MarketIndicator[] = [];
  let editions: EditionExtras[] = [];
  try {
    const [result, market, publishedEditions] = await Promise.all([readPanoramaData(false), readMarketIndicators(false), readEditionExtras(false)]);
    indicators = market;
    editions = publishedEditions;
    initialData = {
      categories: result.categories,
      posts: result.posts.map((post) => ({
        id: post.id,
        title: post.title,
        categoryId: post.category_id,
        summary: post.summary,
        content: post.content,
        impact: post.impact,
        showImpact: post.show_impact,
        publishedAt: post.published_on,
        source: post.source,
        status: "Publicado" as const,
        featured: post.featured,
      })),
    };
  } catch {
    // The client shows an error and supports retry if the database is offline.
  }
  return <PanoramaPortal initialData={initialData} initialIndicators={indicators} initialEditions={editions} />;
}
