import AboutPreview from "@/components/sections/AboutPreview";
import FeaturedBook from "@/components/sections/FeaturedBook";
import Hero from "@/components/sections/Hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <AboutPreview />
      <FeaturedBook />
    </main>
  );
}
