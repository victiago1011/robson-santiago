import type { Metadata } from "next";
import Link from "next/link";
import PanoramaPortal from "@/components/financas/PanoramaPortal";
import type { EditorialPost, EditorialState } from "@/lib/panorama/editorial-client";
import type { EditionExtras } from "@/lib/panorama/edition-extras";

export const metadata: Metadata = {
  title: "Prévia da organização por assuntos — Panorama 360°",
  description: "Demonstração visual fictícia da leitura das notícias agrupadas por dia e por tema.",
  robots: { index: false, follow: false },
};

const categories = [
  { id: "brasil", name: "Brasil" },
  { id: "mundo", name: "Mundo" },
  { id: "negocios", name: "Negócios" },
  { id: "santa-catarina", name: "Santa Catarina" },
];

const examples: Array<[string, string, string, string]> = [
  ["brasil", "Juros e crédito: como as decisões econômicas chegam ao cotidiano", "Uma leitura dos efeitos das taxas de juros para empresas e consumidores.", "2026-11-05"],
  ["brasil", "Orçamento público e confiança: o que acompanhar", "Por que as contas públicas influenciam o planejamento econômico.", "2026-11-05"],
  ["brasil", "Mudanças tributárias e os desafios das empresas", "O planejamento das empresas depende de compreender as regras aplicáveis.", "2026-11-05"],
  ["brasil", "Jornadas de trabalho e produtividade em debate", "Uma visão sobre a organização do trabalho e seus possíveis impactos.", "2026-11-05"],
  ["brasil", "Congresso e pautas que afetam a economia", "O caminho das propostas legislativas pode influenciar diversos setores.", "2026-11-05"],
  ["brasil", "Governança bancária e confiança no sistema financeiro", "Entenda por que supervisão e transparência são importantes.", "2026-11-05"],
  ["mundo", "Política nos Estados Unidos e expectativas globais", "Uma análise dos possíveis efeitos de mudanças políticas no comércio.", "2026-11-05"],
  ["mundo", "Riscos financeiros e negócios na América do Sul", "As oportunidades internacionais também exigem atenção à governança.", "2026-11-05"],
  ["mundo", "Geopolítica, energia e cadeias de abastecimento", "Como acontecimentos internacionais se relacionam com a economia.", "2026-11-05"],
  ["negocios", "Inteligência artificial e novos hábitos de consumo", "Ferramentas digitais transformam a busca por produtos e serviços.", "2026-11-05"],
  ["negocios", "O que observar nas vendas de fim de ano", "Volume de vendas e lucro exigem análises diferentes.", "2026-11-05"],
  ["negocios", "Minerais estratégicos e oportunidades industriais", "Uma reflexão sobre as cadeias globais de valor e tecnologia.", "2026-11-05"],
  ["santa-catarina", "Infraestrutura e adaptação climática no Sul", "Planejar a continuidade das operações também é parte da economia.", "2026-11-05"],
  ["brasil", "Planejamento financeiro e orçamento familiar", "Princípios gerais de organização das finanças pessoais.", "2026-11-04"],
  ["mundo", "Comércio global e relações entre mercados", "Por que as decisões comerciais atravessam fronteiras.", "2026-11-04"],
  ["negocios", "Produtividade e tecnologia nas pequenas empresas", "O papel de processos e ferramentas na competitividade.", "2026-11-04"],
];

const posts: EditorialPost[] = examples.map(([categoryId, title, summary, publishedAt], index) => ({
  id: "panorama-demo-" + (index + 1),
  title,
  summary,
  categoryId,
  publishedAt,
  status: "Publicado",
  featured: index === 0 || index === 6 || index === 9,
  content: "Este é um texto exclusivamente ilustrativo para demonstrar como as notícias aparecem dentro de cada assunto. Não representa uma notícia verificada.\n\nNa versão definitiva, este espaço exibirá o texto publicado pelo Robson pelo painel administrativo.",
  impact: "Na versão definitiva, o Robson poderá acrescentar aqui sua explicação sobre por que esse tema importa para o leitor.",
  showImpact: true,
  source: "Conteúdo fictício de demonstração visual",
}));

const previewData: EditorialState = { categories, posts };
const previewEditional: EditionExtras[] = [{
  published_on: "2026-11-05",
  historical_events: [
    { year: "1900", title: "Marco histórico fictício da demonstração", description: "Este é um exemplo visual, não um acontecimento histórico real.", source: "Conteúdo ilustrativo" },
    { year: "2000", title: "Segundo exemplo de uma efeméride", description: "O administrador cadastrará fatos reais e verificados para cada edição.", source: "Conteúdo ilustrativo" },
  ],
  agenda_items: [
    { text: "Acompanhar o próximo comunicado de política monetária", on: null },
    { text: "Observar os próximos resultados financeiros de empresas de tecnologia", on: null },
    { text: "Revisar os indicadores de inflação divulgados no período", on: null },
  ],
  commentary_title: "Confiança e planejamento diante das incertezas",
  commentary_body: "Esta é uma análise fictícia criada apenas para demonstrar a aparência da seção editorial. O Robson poderá escrever uma reflexão própria para encerrar cada edição.\\n\\nNa versão oficial, este texto será exibido somente depois da revisão e da publicação pelo administrador.",
  status: "published",
}];


export default function PanoramaGroupedDemoPage() {
  return (
    <>
      <div className="border-b border-[#dbc18b] bg-[#fff5d8] px-5 py-4 text-center font-sans text-sm leading-relaxed text-[#785722]">
        <strong>Prévia visual com textos fictícios.</strong> Esta página demonstra a organização por data e assunto;
        nenhuma das manchetes abaixo é uma notícia real.{" "}
        <Link href="/financas" className="font-bold underline underline-offset-4">
          Ir para o Panorama oficial ↗
        </Link>
      </div>
      <PanoramaPortal initialData={previewData} initialEditions={previewEditional} />
    </>
  );
}
