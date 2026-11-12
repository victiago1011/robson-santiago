import { Suspense } from "react";
import PanoramaTextEditor from "@/components/financas/PanoramaTextEditor";
import { requireAdminPage } from "@/lib/admin/guard";
import { readTextEditions } from "@/lib/panorama/plain-edition-store";

export const dynamic = "force-dynamic";

async function PanoramaPanelContent() {
  if (!(await requireAdminPage())) return null;
  try {
    const editions = await readTextEditions();
    return <PanoramaTextEditor initialEditions={editions} />;
  } catch {
    return <div role="alert" className="rounded-2xl border border-[#e5c9b8] bg-white p-8 text-sm text-[#a2523b]">
      Não foi possível carregar as edições. Confira a conexão com o banco de dados e recarregue a página.
    </div>;
  }
}
export default function AdminPanoramaPage() {
  return <Suspense fallback={<div role="status" className="rounded-xl bg-white p-8 text-[#607b90]">Carregando editor…</div>}>
    <PanoramaPanelContent />
  </Suspense>;
}
