import AboutPreview from "@/components/sections/AboutPreview";
import CorrenteDoBem from "@/components/sections/CorrenteDoBem";
import FeaturedBook from "@/components/sections/FeaturedBook";
import Hero from "@/components/sections/Hero";
import LivroParafraseado from "@/components/sections/LivroParafraseado";
import VezPodcast from "@/components/sections/VezPodcast";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <AboutPreview />
      <FeaturedBook />
      <VezPodcast />
      <CorrenteDoBem />
      <LivroParafraseado />
    </main>
  );
}
