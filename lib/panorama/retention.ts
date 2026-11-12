/**
 * Retention for the Panorama 360 archive: today and the six preceding calendar
 * days remain visible. Earlier editions are removed from both site and database.
 * The cutoff is based on the editorial timezone, never on the visitor's timezone.
 */
export const PANORAMA_RETENTION_DAYS = 7;
export const PANORAMA_TIMEZONE = "America/Sao_Paulo";

export function panoramaOldestVisibleDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PANORAMA_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => Number(parts.find((value) => value.type === name)?.value);
  const earliest = Date.UTC(part("year"), part("month") - 1, part("day") - (PANORAMA_RETENTION_DAYS - 1));
  return new Date(earliest).toISOString().slice(0, 10);
}

export function isPanoramaDateExpired(date: string, now = new Date()): boolean {
  return date < panoramaOldestVisibleDay(now);
}
