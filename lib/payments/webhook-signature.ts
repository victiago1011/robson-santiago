import { createHmac, timingSafeEqual } from "node:crypto";

export type ParsedWebhookSignature = {
  ts: string;
  v1: string;
};

export function parseSignatureHeader(header: string | null | undefined): ParsedWebhookSignature | null {
  if (!header?.trim()) {
    return null;
  }

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [rawKey, ...rest] = part.split("=");
      return [rawKey.trim(), rest.join("=").trim()];
    }),
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) {
    return null;
  }

  return { ts, v1 };
}

export function normalizeWebhookDataId(dataId: string): string {
  return dataId.trim().toLowerCase();
}

export function extractWebhookDataId(input: {
  searchParams: URLSearchParams;
  body: unknown;
}): string | null {
  const fromQuery = input.searchParams.get("data.id") ?? input.searchParams.get("id");
  if (fromQuery?.trim()) {
    return fromQuery.trim();
  }

  if (
    typeof input.body === "object" &&
    input.body !== null &&
    "data" in input.body &&
    typeof input.body.data === "object" &&
    input.body.data !== null &&
    "id" in input.body.data
  ) {
    const rawId = input.body.data.id;
    if (typeof rawId === "string" && rawId.trim()) {
      return rawId.trim();
    }
    if (typeof rawId === "number" && Number.isFinite(rawId)) {
      return String(rawId);
    }
  }

  return null;
}

export function buildWebhookManifest(input: {
  dataId?: string | null;
  requestId?: string | null;
  ts: string;
}): string {
  const segments: string[] = [];

  if (input.dataId) {
    segments.push(`id:${normalizeWebhookDataId(input.dataId)}`);
  }
  if (input.requestId) {
    segments.push(`request-id:${input.requestId}`);
  }
  segments.push(`ts:${input.ts}`);

  return `${segments.join(";")};`;
}

export function signaturesMatch(expectedHex: string, computedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "utf8");
  const computed = Buffer.from(computedHex, "utf8");
  if (expected.length !== computed.length) {
    return false;
  }
  return timingSafeEqual(expected, computed);
}

export const WEBHOOK_SIGNATURE_MAX_AGE_MS = 15 * 60 * 1000;

export function webhookTimestampToMs(ts: string): number | null {
  if (!/^\d+$/.test(ts)) {
    return null;
  }
  if (ts.length >= 13) {
    const ms = Number(ts);
    return Number.isSafeInteger(ms) ? ms : null;
  }
  const seconds = Number(ts);
  if (!Number.isSafeInteger(seconds)) {
    return null;
  }
  return seconds * 1000;
}

export function isWebhookTimestampFresh(
  ts: string,
  nowMs: number = Date.now(),
  maxAgeMs: number = WEBHOOK_SIGNATURE_MAX_AGE_MS,
): boolean {
  const tsMs = webhookTimestampToMs(ts);
  if (tsMs === null) {
    return false;
  }
  return Math.abs(nowMs - tsMs) <= maxAgeMs;
}

export function verifyMercadoPagoSignature(input: {
  secret: string;
  signatureHeader: string | null | undefined;
  requestId: string | null | undefined;
  dataId: string | null | undefined;
}): boolean {
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed || !input.secret) {
    return false;
  }

  const manifest = buildWebhookManifest({
    dataId: input.dataId,
    requestId: input.requestId,
    ts: parsed.ts,
  });
  const computed = createHmac("sha256", input.secret).update(manifest).digest("hex");
  return signaturesMatch(parsed.v1, computed);
}
