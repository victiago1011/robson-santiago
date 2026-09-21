/**
 * How long a download token remains valid after the delivery row is created.
 * Compared on the server against `digital_deliveries.created_at` (no client clock).
 * Change this constant to adjust the window; no schema change is required.
 */
export const DIGITAL_DELIVERY_DOWNLOAD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const EBOOK_STORAGE_BUCKET = "ebooks";

export const EBOOK_DOWNLOAD_FILENAME = "A-Vida-e-um-Dia-Robson-Santiago.pdf";

export const EBOOK_DOWNLOAD_PATH_PREFIX = "/api/ebook/download";

export function ebookDownloadValidityDays(
  ttlMs: number = DIGITAL_DELIVERY_DOWNLOAD_TTL_MS,
): number {
  return Math.round(ttlMs / (24 * 60 * 60 * 1000));
}

const MAX_DOWNLOAD_TOKEN_LENGTH = 128;

export function isEbookDownloadExpired(
  createdAt: string | null | undefined,
  nowMs: number,
  ttlMs: number = DIGITAL_DELIVERY_DOWNLOAD_TTL_MS,
): boolean {
  if (!createdAt) {
    return true;
  }
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) {
    return true;
  }
  return nowMs - createdMs >= ttlMs;
}

export function normalizeDownloadToken(rawToken: string | null | undefined): string | null {
  if (typeof rawToken !== "string") {
    return null;
  }
  let decoded = rawToken.trim();
  if (!decoded) {
    return null;
  }
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }
  decoded = decoded.trim();
  if (!decoded || decoded.length > MAX_DOWNLOAD_TOKEN_LENGTH) {
    return null;
  }
  return decoded;
}

export function isSafeEbookObjectPath(path: string | null | undefined): boolean {
  if (typeof path !== "string") {
    return false;
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.includes("..") || trimmed.includes("\\") || trimmed.includes("://")) {
    return false;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("./")) {
    return false;
  }
  return true;
}
