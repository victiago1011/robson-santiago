export const ORDER_TRACKING_PATH_PREFIX = "/pedido/acompanhar";

const MAX_TOKEN_LENGTH = 128;

export function normalizeTrackingToken(raw: string): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  let value = raw.trim();
  if (!value || value.length > MAX_TOKEN_LENGTH) {
    return null;
  }
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  value = value.trim();
  if (!value || value.length > MAX_TOKEN_LENGTH) {
    return null;
  }
  return value;
}

export function buildOrderTrackingUrl(appUrl: string, rawToken: string): string {
  return `${appUrl}${ORDER_TRACKING_PATH_PREFIX}/${encodeURIComponent(rawToken)}`;
}
