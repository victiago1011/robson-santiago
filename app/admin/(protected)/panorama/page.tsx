import { Suspense } from "react";
import PanoramaAdminPreview from "@/components/financas/PanoramaAdminPreview";
import { requireAdminPage } from "@/lib/admin/guard";
import { readPanoramaData } from "@/lib/panorama/store";
import { readEditionExtras } from "@/lib/panorama/edition-store";
import type { EditionExtras } from "@/lib/panorama/edition-extras";
import type { EditorialState } from "@/lib/panorama/editorial-client";

export const dynamic = "force-dynamic";

async function PanoramaPanelContent() {
  if (!(await requireAdminPage())) return null;

  let initialData: EditorialState | undefined;
  let initialEditions: EditionExtras[] = [];
  try {
    const [rows, editions] = await Promise.all([readPanoramaData(true), readEditionExtras(true)]);
    initialEditions = editions;
    initialData = {
      categories: rows.categories,
      posts: rows.posts.map((post) => ({
        id: post.id,
        title: post.title,
        categoryId: post.category_id,
        summary: post.summary,
        content: post.content,
        impact: post.impact,
        showImpact: post.show_impact,
        source: post.source,
        publishedAt: post.published_on,
        status: (post.status === "published" ? "Publicado" : "Rascunho") as "Publicado" | "Rascunho",
        featured: post.featured,
      })),
    };
  } catch {
    // The editor falls back to its authenticated API with a retry control.
  }
  return <PanoramaAdminPreview initialData={initialData} initialEditions={initialEditions} />;
}

export default function AdminPanoramaPage() {
  return (
    <Suspense fallback={
      <div role="status" className="rounded-2xl border border-[#dfe6eb] bg-white p-8 text-sm text-[#567186]">
        Preparando as notícias e categorias…
      </div>
    }>
      <PanoramaPanelContent />
    </Suspense>
  );
}
