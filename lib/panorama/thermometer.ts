/**
 * Pure text helpers for the economic thermometer.
 * The TXT remains the single source of truth: edits modify only this section.
 */
export type ThermometerMetric = {
  lineIndex: number;
  icon: string;
  label: string;
  value: string;
};
export type ThermometerGroup = { title: string; metrics: ThermometerMetric[] };
export type ThermometerModel = {
  reference: string[];
  groups: ThermometerGroup[];
  notes: string[];
  reading: string;
  hasReading: boolean;
};

const cleanHeading = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .trim().toLocaleUpperCase("pt-BR");

export function isMarketReadingHeader(value: string): boolean {
  return /^LEITURA (?:DO|DOS|DE|DA) (?:MERCADOS?|INDICADORES|TERMOMETRO)(?::)?$/u
    .test(cleanHeading(value.replace(/^[^\p{L}]+/u, "")));
}

const PREFIX_EMOJI = /^((?:[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]+\s*)*)/u;
const groupLabels = new Set(["BRASIL", "ESTADOS UNIDOS", "MERCADOS INTERNACIONAIS", "INTERNACIONAL", "EUROPA", "COMMODITIES", "CRIPTOMOEDAS", "CRIPTOS", "ASIA", "OUTROS INDICADORES", "CÂMBIO", "CAMBIO", "JUROS", "BOLSAS", "ENERGIA", "MERCADO INTERNACIONAL", "JUROS E MOEDAS"]);

export function parseThermometer(body: string): ThermometerModel {
  const lines = body.split("\n");
  const readingIndex = lines.findIndex(isMarketReadingHeader);
  const before = readingIndex < 0 ? lines : lines.slice(0, readingIndex);
  const reading = readingIndex < 0 ? "" : lines.slice(readingIndex + 1).join("\n").trim();
  const groups: ThermometerGroup[] = [];
  const reference: string[] = [];
  const notes: string[] = [];
  let current: ThermometerGroup | null = null;
  const ensureGroup = () => {
    if (!current) {
      current = { title: "", metrics: [] };
      groups.push(current);
    }
    return current;
  };

  before.forEach((original, lineIndex) => {
    const line = original.trim();
    if (!line) return;
    const bare = line.replace(/^[*•-]\s*/, "").trim();
    const emoji = bare.match(PREFIX_EMOJI)?.[0] || "";
    const withoutIcon = bare.slice(emoji.length).trim();
    const groupCandidate = cleanHeading(withoutIcon);
    if (!/^[*•-]\s/.test(line) && groupLabels.has(groupCandidate)) {
      current = { title: line, metrics: [] };
      groups.push(current);
      return;
    }
    if (/^(?:refer[êe]ncia\b|indicadores?\b|dados\s+de)/iu.test(withoutIcon)
      || /(?:n[aã]o s[aã]o cota[cç][oõ]es em tempo real|[uú]ltimo fechamento dispon[ií]vel)/iu.test(withoutIcon)) {
      reference.push(line);
      return;
    }
    const match = withoutIcon.match(/^([^:\n]{2,64}):\s*(\S.*?)\s*$/u);
    if (match) {
      ensureGroup().metrics.push({
        lineIndex,
        icon: emoji.trim(),
        label: match[1].trim(),
        value: match[2].trim(),
      });
      return;
    }
    notes.push(line);
  });
  return { reference, groups: groups.filter((group) => group.metrics.length > 0), notes, reading, hasReading: readingIndex >= 0 && reading.length > 0 };
}

/** Locate numbered "1. TERMÔMETRO ECONÔMICO" without touching headlines elsewhere. */
function thermometerSpan(text: string): { lines: string[]; first: number; last: number } | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex((line) =>
    /(?:^|\s)\d{1,3}\.\s+TERMOMETRO ECONOMICO\s*$/u.test(cleanHeading(line)));
  if (first < 0) return null;
  const divider = /^(?:⸻+|[-—–━─]{3,})$/u;
  let last = lines.findIndex((line, i) => i > first && divider.test(line.trim()));
  if (last < 0) {
    last = lines.findIndex((line, i) => i > first
      && /^.{0,16}?\s*\d{1,3}\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕ].+/u.test(line.trim()));
  }
  if (last < 0) last = lines.length;
  return { lines, first, last };
}

export function updateThermometerBody(text: string, body: string): string {
  const span = thermometerSpan(text);
  if (!span) return text;
  const replacement = body.replace(/\r\n?/g, "\n").trim().split("\n");
  return [...span.lines.slice(0, span.first + 1), "", ...replacement, "",
    ...span.lines.slice(span.last)].join("\n");
}

export function updateThermometerMetric(text: string, lineIndex: number, value: string): string {
  const span = thermometerSpan(text);
  if (!span || lineIndex < 0) return text;
  const originalBody = span.lines.slice(span.first + 1, span.last).join("\n").trim();
  const lines = originalBody.split("\n");
  const original = lines[lineIndex];
  if (!original) return text;
  const separator = original.indexOf(":");
  if (separator < 0) return text;
  lines[lineIndex] = original.slice(0, separator + 1) + " " + value.replace(/[\r\n]/g, " ").trim();
  return updateThermometerBody(text, lines.join("\n"));
}
