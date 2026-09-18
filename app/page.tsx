import AboutPreview from "@/components/sections/AboutPreview";
import ConfrariaFinancas from "@/components/sections/ConfrariaFinancas";
import CorrenteDoBem from "@/components/sections/CorrenteDoBem";
import FeaturedBook from "@/components/sections/FeaturedBook";
import FinancePreview from "@/components/sections/FinancePreview";
import Hero from "@/components/sections/Hero";
import LivroParafraseado from "@/components/sections/LivroParafraseado";
import VezPodcast from "@/components/sections/VezPodcast";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <AboutPreview />
      <FinancePreview />
      <VezPodcast />
      <CorrenteDoBem />
      <FeaturedBook />
      <ConfrariaFinancas />
      <LivroParafraseado />
    </main>
  );
}
