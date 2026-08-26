import type { Metadata } from "next";
import LivroDestaques from "@/components/sections/livro/LivroDestaques";
import LivroEdicoes from "@/components/sections/livro/LivroEdicoes";
import LivroFicha from "@/components/sections/livro/LivroFicha";
import LivroHero from "@/components/sections/livro/LivroHero";
import LivroParaQuem from "@/components/sections/livro/LivroParaQuem";
import LivroUniverso from "@/components/sections/livro/LivroUniverso";

const description =
  "A Vida é um Dia, de Robson Santiago: uma ficção brasileira sobre sete seres, o planeta Ácqua e o valor do momento.";

export const metadata: Metadata = {
  title: "A Vida é um Dia — Robson Santiago",
  description,
  openGraph: {
    title: "A Vida é um Dia — Robson Santiago",
    description,
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/images/books/a-vida-e-um-dia.png",
        width: 794,
        height: 1285,
        alt: "Capa do livro A Vida é um Dia, de Robson Santiago",
      },
    ],
  },
};

export default function LivroPage() {
  return (
    <main className="flex flex-1 flex-col">
      <LivroHero />
      <LivroDestaques />
      <LivroFicha />
      <LivroUniverso />
      <LivroParaQuem />
      <LivroEdicoes />
    </main>
  );
}
