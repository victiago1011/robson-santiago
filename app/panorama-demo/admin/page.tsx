import type { Metadata } from "next";
import Link from "next/link";
import PanoramaAdminPreview from "@/components/financas/PanoramaAdminPreview";

export const metadata: Metadata = {
  title: "Prévia do painel editorial — Panorama 360°",
  description: "Demonstração de interface sem conexão com pedidos, usuários ou dados reais.",
  robots: { index: false, follow: false },
};

export default function PanoramaDemoAdminPage() {
  return (
    <main className="min-h-screen bg-[#f3f6fa] text-[#142e44]">
      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8d1a0] bg-[#fff6df] px-4 py-3 text-sm text-[#745429]">
          <span><strong>Prévia pública do painel editorial.</strong> Nenhuma conexão com o ADM real, usuários ou Supabase.</span>
          <Link href="/financas" className="font-bold underline underline-offset-4">Ver portal de notícias →</Link>
        </div>
        <PanoramaAdminPreview />
      </div>
    </main>
  );
}
