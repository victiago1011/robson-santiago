import {
  EBOOK_DOWNLOAD_FILENAME,
  isEbookDownloadExpired,
  isSafeEbookObjectPath,
  normalizeDownloadToken,
} from "@/lib/digital-delivery/download-policy";
import { hashDigitalDeliveryToken } from "@/lib/digital-delivery/token";
import type {
  DigitalDeliveryDownloadContext,
  DigitalDeliveryDownloadStore,
} from "@/lib/digital-delivery/types";

export type AuthorizeEbookDownloadResult =
  | { status: "allowed"; deliveryId: string; objectPath: string }
  | { status: "denied" }
  | { status: "unavailable" };

export type FetchEbookObjectResult = { ok: true; body: Uint8Array } | { ok: false };

export type EbookDownloadHandlerResult =
  | { kind: "file"; body: Uint8Array; filename: string }
  | { kind: "denied" }
  | { kind: "unavailable" };

export function authorizeEbookDownload(
  context: DigitalDeliveryDownloadContext | null,
  nowMs: number,
): AuthorizeEbookDownloadResult {
  if (!context) {
    return { status: "denied" };
  }
  if (context.revokedAt) {
    return { status: "denied" };
  }
  if (context.paymentStatus !== "approved") {
    return { status: "denied" };
  }
  if (isEbookDownloadExpired(context.createdAt, nowMs)) {
    return { status: "denied" };
  }
  const objectPath = context.digitalFilePath?.trim() ?? "";
  if (!isSafeEbookObjectPath(objectPath)) {
    return { status: "unavailable" };
  }
  return {
    status: "allowed",
    deliveryId: context.id,
    objectPath,
  };
}

export async function handleEbookDownload(
  rawToken: string | null | undefined,
  deps: {
    store: DigitalDeliveryDownloadStore;
    fetchEbookObject: (objectPath: string) => Promise<FetchEbookObjectResult>;
    nowMs?: number;
  },
): Promise<EbookDownloadHandlerResult> {
  const token = normalizeDownloadToken(rawToken);
  if (!token) {
    return { kind: "denied" };
  }

  const nowMs = deps.nowMs ?? Date.now();
  const tokenHash = hashDigitalDeliveryToken(token);

  let context: DigitalDeliveryDownloadContext | null;
  try {
    context = await deps.store.findDownloadContextByTokenHash(tokenHash);
  } catch {
    return { kind: "unavailable" };
  }

  const authorized = authorizeEbookDownload(context, nowMs);
  if (authorized.status !== "allowed") {
    return { kind: authorized.status };
  }

  let file: FetchEbookObjectResult;
  try {
    file = await deps.fetchEbookObject(authorized.objectPath);
  } catch {
    return { kind: "unavailable" };
  }
  if (!file.ok) {
    return { kind: "unavailable" };
  }

  try {
    await deps.store.recordDownload(authorized.deliveryId, nowMs);
  } catch {
    console.error("ebook_download_metrics_failed", { code: "DOWNLOAD_METRICS_FAILED" });
  }

  return {
    kind: "file",
    body: file.body,
    filename: EBOOK_DOWNLOAD_FILENAME,
  };
}

export function ebookDownloadToResponse(result: EbookDownloadHandlerResult): Response {
  if (result.kind === "file") {
    return new Response(Buffer.from(result.body), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const status = result.kind === "unavailable" ? 503 : 404;
  const code = result.kind === "unavailable" ? "UNAVAILABLE" : "NOT_FOUND";
  return Response.json({ ok: false, code }, { status });
}
