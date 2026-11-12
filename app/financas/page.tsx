import type { Metadata } from "next";
import PanoramaTextPortal from "@/components/financas/PanoramaTextPortal";
import { readPublicTextEditions, type PublicTextEdition } from "@/lib/panorama/plain-edition-store";
import { readPanoramaData } from "@/lib/panorama/store";
import { readMarketSnapshots, type MarketSnapshot } from "@/lib/panorama/market-store";
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
  let initialData: EditorialState = { categories: [], posts: [] };
  let snapshots: MarketSnapshot[] = [];
  let editions: EditionExtras[] = [];
  let textEditions: PublicTextEdition[] = [];

  // Preserve all previously published dates when moving to the simplified editor.
  try {
    const result = await readPanoramaData(false);
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
    // The older archive is optional and never blocks the new editions.
  }
  try { snapshots = await readMarketSnapshots(false); } catch { /* Legacy fallback only. */ }
  try { editions = await readEditionExtras(false); } catch { /* Legacy fallback only. */ }
  try { textEditions = await readPublicTextEditions(); } catch { /* Site remains readable during migration. */ }
  return <PanoramaTextPortal textEditions={textEditions} legacyData={initialData}
    legacyExtras={editions} legacySnapshots={snapshots} />;
}
