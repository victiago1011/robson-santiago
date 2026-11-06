import type { EditorialCategory, EditorialPost } from "./editorial-client";
import type { AgendaItem } from "./edition-extras";

export type ExtractedEdition = {
  posts: EditorialPost[];
  agenda: AgendaItem[];
  commentaryTitle: string;
  commentaryBody: string;
};

type Working = { title: string; category: string; body: string[]; impact: string[]; inImpact: boolean };
const unmark = (value: string) => value.replace(/^[\s*•—–-]+/, "").trim();

function categoryFromHeading(title: string, symbol: string, fallback: string) {
  const normalized = title.toLocaleLowerCase("pt-BR");
  if (symbol.includes("🇺🇸") || symbol.includes("🇫🇷") || symbol.includes("🇵🇾") || symbol.includes("🌍")
    || /wall street|frança|paraguai|geopolítica|guerra|estados unidos/.test(normalized)) return "Mundo";
  if (symbol.includes("🇧🇷") || symbol.includes("🏛") || /lula|tributária|banco central|copom|imposto seletivo/.test(normalized)) return "Brasil";
  if (/gestores de fundos|bolsas|recessão|mercados financeiros/.test(normalized)) return "Economia & Mercados";
  return fallback;
}
function findCategory(name: string, categories: readonly EditorialCategory[]): string {
  return categories.find((cat) => cat.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))?.id
    ?? categories.find((cat) => cat.name === "Mundo")?.id
    ?? categories[0]?.id ?? "";
}

export function parseCompleteEdition(
  raw: string,
  day: string,
  categories: EditorialCategory[],
): ExtractedEdition {
  const posts: EditorialPost[] = [];
  const agenda: AgendaItem[] = [];
  const commentary: string[] = [];
  let commentaryTitle = "";
  let section: "intro" | "news" | "market" | "agenda" | "commentary" | "footnotes" = "intro";
  let lastNumber = 0;
  let current: Working | null = null;
  let category = "Brasil";

  const flush = () => {
    if (current) {
      const content = current.body.join("\n\n").trim();
      if (content) {
        const impact = current.impact.join("\n\n").trim();
        posts.push({
          id: crypto.randomUUID(),
          title: current.title,
          categoryId: findCategory(current.category, categories),
          summary: current.body.find((text) => text.trim())?.slice(0, 240) ?? "",
          content, impact, showImpact: !!impact,
          publishedAt: day, status: "Rascunho", featured: false,
          source: "Edição do Panorama 360° — confirmar fontes na revisão",
        });
      }
    }
    current = null;
  };

  const lines = raw.split(/\r?\n/);
  for (const original of lines) {
    const line = original.trim();
    if (!line || /^⸻|^──|^===/.test(line)) continue;
    const upper = line.toLocaleUpperCase("pt-BR");

    if (/^🌐.*PANORAMA 360|^FONTES\s*[:：]|^FONTES DE REFERÊNCIA\s*[:：]/i.test(line)) {
      if (section === "commentary") {
        // End-signature and references belong to the document, not the opinion body.
        section = "footnotes";
      }
      continue;
    }
    if (section === "footnotes") continue;

    // Legacy editions use standalone category headings.
    if (/^.{0,8}(?:BRASIL\s*[—–-]|MUNDO\s*[—–-]|EMPRESAS,?\s*NEGÓCIOS|SANTA CATARINA\s*[—–-])/.test(upper)
      && line.length < 105) {
      flush();
      category = upper.includes("MUNDO") ? "Mundo"
        : upper.includes("EMPRESAS") ? "Negócios"
          : upper.includes("SANTA CATARINA") ? "Santa Catarina" : "Brasil";
      section = "news";
      continue;
    }

    const numbered = line.match(/^([^\p{L}\p{N}]*?)(\d{1,2})\.\s+(.{5,})$/u);
    const n = numbered ? Number(numbered[2]) : 0;
    const title = numbered?.[3]?.trim() || "";

    if (numbered && n === lastNumber + 1) {
      flush();
      lastNumber = n;
      if (/TERMÔMETRO ECONÔMICO|TERMOMETRO ECONOMICO/.test(title.toLocaleUpperCase("pt-BR"))) {
        section = "market";
      } else if (/AGENDA (DO INVESTIDOR|[-–—])|^AGENDA$/.test(title.toLocaleUpperCase("pt-BR"))) {
        section = "agenda";
      } else if (/VISÃO DO COMENTARISTA|VISAO DO COMENTARISTA/.test(title.toLocaleUpperCase("pt-BR"))) {
        section = "commentary";
      } else {
        section = "news";
        const inferred = categoryFromHeading(title, numbered[1], category);
        current = { title, category: inferred, body: [], impact: [], inImpact: false };
      }
      continue;
    }

    if (/AGENDA\s*[—–-]|HISTÓRIA E MEMÓRIA/.test(upper) && line.length < 100) {
      flush();
      section = "agenda";
      continue;
    }
    if (/VISÃO DO COMENTARISTA|VISAO DO COMENTARISTA/.test(upper) && line.length < 100) {
      flush();
      section = "commentary";
      continue;
    }

    if (section === "agenda") {
      const item = line.match(/^(?:\d{1,2}[.)]\s*|[•*]\s+)(.+)$/);
      if (item) agenda.push({ text: unmark(item[1]), on: null });
      continue;
    }

    if (section === "commentary") {
      if (!commentaryTitle) commentaryTitle = line;
      else commentary.push(line);
      continue;
    }
    if (section !== "news" || !current) continue;
    if (/^POR QUE IMPORTA\s*\??$/i.test(line)) {
      current.inImpact = true;
      continue;
    }
    if (current.inImpact) current.impact.push(line);
    else current.body.push(line);
  }
  flush();
  return {
    posts, agenda,
    commentaryTitle,
    commentaryBody: commentary.join("\n\n").trim(),
  };
}
