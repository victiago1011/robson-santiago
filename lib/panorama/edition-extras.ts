export type AgendaItem = { text: string; on: string | null };
export type HistoricalEvent = { year: string; title: string; description: string; source: string };
export type EditionExtras = {
  published_on: string;
  agenda_items: AgendaItem[];
  historical_events: HistoricalEvent[];
  commentary_title: string;
  commentary_body: string;
  status: "draft" | "published";
};

export function emptyEditionExtras(day: string): EditionExtras {
  return { published_on: day, agenda_items: [], historical_events: [], commentary_title: "", commentary_body: "", status: "draft" };
}

export function editionHasContent(value: EditionExtras) {
  return value.historical_events.some((item) => item.title.trim())
    || !!value.commentary_body.trim();
}

export function formattedAgendaDay(on: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return on;
  const [year, month, day] = on.split("-");
  return day + "/" + month + "/" + year;
}
