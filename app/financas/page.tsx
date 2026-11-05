import type { Metadata } from "next";
import PanoramaPortal from "@/components/financas/PanoramaPortal";

export const metadata: Metadata = {
  title: "Panorama 360° — Robson Santiago",
  description: "Brasil, mundo, economia e política. A notícia, o contexto e o que realmente importa.",
  robots: { index: false, follow: false },
};

export default function FinancasPage() {
  return <PanoramaPortal />;
}
