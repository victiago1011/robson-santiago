/**
 * Parser de apresentação do Panorama 360°.
 * Não resume, reescreve, verifica ou corrige as informações editoriais.
 * Interpreta títulos e divisões somente para a leitura visual.
 */
export type PanoramaSection = {
  number: number | null;
  icon: string;
  title: string;
  body: string;
};
export type ParsedPanorama = {
  date: string | null;
  opening: PanoramaSection | null;
  thermometer: PanoramaSection | null;
  news: PanoramaSection[];
  commentary: PanoramaSection | null;
  history: PanoramaSection | null;
  sources: string;
};

const months: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4,
  MAIO: 5, JUNHO: 6, JULHO: 7, AGOSTO: 8,
  SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};
const compact = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase("pt-BR").replace(/\s+/g, " ").trim();
const trimBody = (lines: string[]) => lines.join("\n").trim();
const separator = /^(?:⸻+|[-—–━─]{3,})$/u;

/** A general history article is NOT the same as events on that calendar date. */
const isDateMilestones = (title: string) =>
  /^(?:MARCOS? HISTORICOS? (?:DESTA|DO|DA) DATA|NESTE DIA NA HISTORIA|EFEMERIDES (?:DESTA|DO|DA) DATA|O QUE ACONTECEU NESTE DIA)\b/u
    .test(compact(title));

const isOpeningHeading = (line: string) => {
  const title = compact(line.replace(/^[^\p{L}]+/u, ""));
  return /^ABERTURA(?: DO DIA)?(?:\s*[—–-]\s*.+)?$/u.test(title)
    || /^(?:O )?RESUMO (?:DO DIA|DA SEMANA) EM (?:60 SEGUNDOS|UM MINUTO)\b/u.test(title);
};

export function editionDateFromText(input: string): string | null {
  const header = input.slice(0, 1600);
  const plain = compact(header);
  const match = plain.match(/\b(\d{1,2}) DE (JANEIRO|FEVEREIRO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO) DE (\d{4})\b/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = months[match[2]];
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() + 1 !== month) return null;
  return String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function sectionHeader(line: string): PanoramaSection | null {
  // The printed number is optional and never used as a fixed section count.
  // Requiring uppercase headings avoids treating internal numbered lists as news.
  const match = line.match(/^(.{0,16}?)\s*(\d{1,3})\.\s+(.+)$/u);
  if (!match) return null;
  const title = match[3].trim();
  if (title.length < 5 || title !== title.toLocaleUpperCase("pt-BR")) return null;
  return { number: Number(match[2]), icon: match[1].trim(), title, body: "" };
}

function trimSignature(value: string) {
  return value.replace(/\s*\nRobson Santiago\s*\n40 anos de experi[êe]ncia no mercado financeiro\s*$/iu, "").trim();
}

export function parsePanoramaEdition(input: string): ParsedPanorama {
  const result: ParsedPanorama = {
    date: editionDateFromText(input),
    opening: null, thermometer: null, news: [], commentary: null, history: null, sources: "",
  };
  const normalized = input.replace(/\r\n?/g, "\n").replace(/\uFEFF/g, "");
  let active: PanoramaSection | null = null;
  let body: string[] = [];
  let inSources = false;
  const sourceLines: string[] = [];
  const commit = () => {
    if (!active) return;
    active.body = trimBody(body);
    if (compact(active.title).includes("VISAO DO COMENTARISTA")) {
      active.body = trimSignature(active.body);
      result.commentary = active;
    } else if (isDateMilestones(active.title)) {
      result.history = active;
    } else if (compact(active.title).includes("TERMOMETRO ECONOMICO")) {
      result.thermometer = active;
    } else if (isOpeningHeading(active.title)) {
      result.opening = active;
    } else {
      result.news.push(active);
    }
    active = null;
    body = [];
  };

  for (const original of normalized.split("\n")) {
    const line = original.trim();
    if (separator.test(line)) continue;
    const upper = compact(line);
    if (inSources) {
      if (/^PANORAMA 360/.test(upper)) continue;
      sourceLines.push(original);
      continue;
    }
    if (/^(?:FONTES\b|FONTES EDITORIAIS\b|FONTES COMPLEMENTARES\b)/.test(upper)) {
      commit();
      inSources = true;
      sourceLines.push(original);
      continue;
    }

    // The repeated masthead at the bottom is not commentary.
    const isCommentary = Boolean(active && compact(active.title).includes("VISAO DO COMENTARISTA"));
    if ((isCommentary || result.commentary) && /^(?:🌐\s*)?PANORAMA 360[°º]?/iu.test(line)) {
      commit();
      continue;
    }
    if (result.commentary && /^(?:BRASIL[,|• ]+MUNDO|A NOTICIA, O CONTEXTO)/.test(upper)) continue;

    const numbered = sectionHeader(line);
    const commentaryHeading = numbered
      ? compact(numbered.title).includes("VISAO DO COMENTARISTA")
      : /^(?:✍️?\s*)?(?:\d+\.\s*)?A VISAO DO COMENTARISTA\b/.test(upper);
    if (commentaryHeading) {
      commit();
      active = numbered || { number: null, icon: "✍️", title: "A VISÃO DO COMENTARISTA", body: "" };
      continue;
    }

    // Once commentary starts, numbered reflection lists belong to the article.
    if (active && compact(active.title).includes("VISAO DO COMENTARISTA")) {
      body.push(original);
      continue;
    }
    if (numbered) {
      commit();
      active = numbered;
      continue;
    }
    if (isDateMilestones(line.replace(/^[^\p{L}]+/u, ""))) {
      commit();
      active = { number: null, icon: "📜", title: line.replace(/^[^\p{L}]+/u, ""), body: "" };
      continue;
    }
    if (isOpeningHeading(line)) {
      commit();
      active = { number: null, icon: "📌", title: line.replace(/^[^\p{L}]+/u, ""), body: "" };
      continue;
    }
    if (active) {
      // The headline immediately below "ABERTURA DO DIA" is part of its title.
      if (compact(active.title) === "ABERTURA DO DIA" && !body.some((item) => item.trim())
          && line.length > 15 && line === line.toLocaleUpperCase("pt-BR")) {
        active.title = "ABERTURA DO DIA — " + line;
      } else {
        body.push(original);
      }
    }
  }
  commit();
  result.sources = sourceLines.join("\n").trim();
  return result;
}

export function splitImpact(body: string) {
  const lines = body.split("\n");
  const index = lines.findIndex((line) => {
    const name = compact(line.replace(/^[💡🔎⚖️\s]+/gu, ""));
    return /^(?:POR QUE IMPORTA\??|O QUE OBSERVAR\??)$/.test(name);
  });
  if (index < 0) return { body: body.trim(), impact: "" };
  return {
    body: lines.slice(0, index).join("\n").trim(),
    impact: lines.slice(index + 1).join("\n").trim(),
  };
}
