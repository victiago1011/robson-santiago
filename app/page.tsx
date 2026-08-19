import AboutPreview from "@/components/sections/AboutPreview";
import FeaturedBook from "@/components/sections/FeaturedBook";
import Hero from "@/components/sections/Hero";
import VezPodcast from "@/components/sections/VezPodcast";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <AboutPreview />
      <FeaturedBook />
      <VezPodcast />
    </main>
  );
}
