export const DEFAULT_RESEND_FROM = "Robson Santiago <livro@send.robsonsantiago.com.br>";

export function getResendApiKey(env: NodeJS.Dict<string> = process.env): string | null {
  const key = env.RESEND_API_KEY?.trim();
  return key ? key : null;
}

export function getResendFrom(env: NodeJS.Dict<string> = process.env): string | null {
  const configured = env.RESEND_FROM?.trim();
  if (!configured) {
    return DEFAULT_RESEND_FROM;
  }
  if (!configured.includes("@") || configured.length > 320) {
    return null;
  }
  return configured;
}

export function normalizeAppUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (!parsed.hostname) {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "supabase.co" || host.endsWith(".supabase.co") || host.includes("supabase.in")) {
    return null;
  }

  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

export function getAppUrl(env: NodeJS.Dict<string> = process.env): string | null {
  return normalizeAppUrl(env.APP_URL);
}
