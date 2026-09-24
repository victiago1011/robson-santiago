import {
  isValidCorreiosTrackingCode,
  normalizeTrackingCode,
} from "@/lib/admin/fulfillment";

/** Official Correios public tracking page (no API credentials). */
export const CORREIOS_TRACKING_BASE_URL =
  "https://rastreamento.correios.com.br/app/index.php";

/**
 * Builds the official Correios tracking URL for a validated SRO code.
 * Returns null when the code is missing or not a valid Correios pattern.
 */
export function buildCorreiosTrackingUrl(rawTrackingCode: string | null | undefined): string | null {
  if (typeof rawTrackingCode !== "string") {
    return null;
  }
  const code = normalizeTrackingCode(rawTrackingCode);
  if (!code || !isValidCorreiosTrackingCode(code)) {
    return null;
  }
  return `${CORREIOS_TRACKING_BASE_URL}?objeto=${encodeURIComponent(code)}`;
}
