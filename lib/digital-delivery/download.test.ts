import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authorizeEbookDownload,
  ebookDownloadToResponse,
  handleEbookDownload,
} from "@/lib/digital-delivery/download";
import {
  DIGITAL_DELIVERY_DOWNLOAD_TTL_MS,
  EBOOK_DOWNLOAD_FILENAME,
  EBOOK_STORAGE_BUCKET,
  isEbookDownloadExpired,
  isSafeEbookObjectPath,
} from "@/lib/digital-delivery/download-policy";
import { hashDigitalDeliveryToken } from "@/lib/digital-delivery/token";
import type {
  DigitalDeliveryDownloadContext,
  DigitalDeliveryDownloadStore,
} from "@/lib/digital-delivery/types";
import { assertNoSensitiveFields } from "@/lib/payments/sanitize";
import type { OrderPaymentStatus } from "@/lib/payments/status";

const NOW = Date.parse("2026-09-20T15:00:00.000Z");
const RAW_TOKEN = "test-download-token-value";
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function context(overrides?: Partial<DigitalDeliveryDownloadContext>): DigitalDeliveryDownloadContext {
  return {
    id: "delivery-1",
    orderId: "order-1",
    orderItemId: "item-1",
    emailStatus: "pending",
    digitalFilePath: "a-vida-e-um-dia-ebook.pdf",
    revokedAt: null,
    downloadCount: 0,
    createdAt: new Date(NOW - 60_000).toISOString(),
    paymentStatus: "approved",
    firstDownloadedAt: null,
    lastDownloadedAt: null,
    ...overrides,
  };
}

type MemoryRow = DigitalDeliveryDownloadContext & { tokenHash: string };

function memoryDownloadStore(seed: MemoryRow[]): DigitalDeliveryDownloadStore & { rows: MemoryRow[] } {
  const rows = seed.map((row) => ({ ...row }));
  return {
    rows,
    findDownloadContextByTokenHash: async (tokenHash) => {
      const row = rows.find((item) => item.tokenHash === tokenHash);
      if (!row) {
        return null;
      }
      const { tokenHash: _hash, ...rest } = row;
      return { ...rest };
    },
    recordDownload: async (deliveryId, nowMs) => {
      const row = rows.find((item) => item.id === deliveryId);
      if (!row) {
        return;
      }
      const nowIso = new Date(nowMs).toISOString();
      row.downloadCount += 1;
      row.firstDownloadedAt = row.firstDownloadedAt ?? nowIso;
      row.lastDownloadedAt = nowIso;
    },
  };
}

function allowedFetch(calls: string[]) {
  return async (objectPath: string) => {
    calls.push(objectPath);
    return { ok: true as const, body: PDF_BYTES };
  };
}

test("token válido + pedido approved → permitido", async () => {
  const authorized = authorizeEbookDownload(context(), NOW);
  assert.equal(authorized.status, "allowed");
  if (authorized.status === "allowed") {
    assert.equal(authorized.objectPath, "a-vida-e-um-dia-ebook.pdf");
  }

  const store = memoryDownloadStore([
    { ...context(), tokenHash: hashDigitalDeliveryToken(RAW_TOKEN) },
  ]);
  const result = await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: allowedFetch([]),
    nowMs: NOW,
  });
  assert.equal(result.kind, "file");
  if (result.kind === "file") {
    assert.equal(result.filename, EBOOK_DOWNLOAD_FILENAME);
    assert.deepEqual([...result.body], [...PDF_BYTES]);
  }
});

test("token inválido → negado", async () => {
  const store = memoryDownloadStore([
    { ...context(), tokenHash: hashDigitalDeliveryToken(RAW_TOKEN) },
  ]);
  const result = await handleEbookDownload("other-token", {
    store,
    fetchEbookObject: async () => {
      throw new Error("should_not_fetch");
    },
    nowMs: NOW,
  });
  assert.equal(result.kind, "denied");
});

test("revoked → negado", () => {
  const authorized = authorizeEbookDownload(
    context({ revokedAt: new Date(NOW).toISOString() }),
    NOW,
  );
  assert.equal(authorized.status, "denied");
});

test("pedido não approved → negado", () => {
  const statuses: OrderPaymentStatus[] = ["pending", "rejected", "cancelled", "refunded"];
  for (const paymentStatus of statuses) {
    assert.equal(authorizeEbookDownload(context({ paymentStatus }), NOW).status, "denied");
  }
});

test("delivery expirada → negado", () => {
  const createdAt = new Date(NOW - DIGITAL_DELIVERY_DOWNLOAD_TTL_MS).toISOString();
  assert.equal(authorizeEbookDownload(context({ createdAt }), NOW).status, "denied");
  assert.equal(isEbookDownloadExpired(createdAt, NOW), true);
  assert.equal(
    isEbookDownloadExpired(new Date(NOW - DIGITAL_DELIVERY_DOWNLOAD_TTL_MS + 1).toISOString(), NOW),
    false,
  );
});

test("sem digital_file_path → indisponível", () => {
  assert.equal(authorizeEbookDownload(context({ digitalFilePath: null }), NOW).status, "unavailable");
  assert.equal(authorizeEbookDownload(context({ digitalFilePath: "  " }), NOW).status, "unavailable");
  assert.equal(authorizeEbookDownload(context({ digitalFilePath: "../secret.pdf" }), NOW).status, "unavailable");
});

test("email_status não enviado ainda não impede o download", () => {
  assert.equal(authorizeEbookDownload(context({ emailStatus: "pending" }), NOW).status, "allowed");
  assert.equal(authorizeEbookDownload(context({ emailStatus: "failed" }), NOW).status, "allowed");
});

test("SHA-256 correto: lookup usa hash e nunca o token bruto", async () => {
  let queried: string | undefined;
  const store: DigitalDeliveryDownloadStore = {
    findDownloadContextByTokenHash: async (tokenHash) => {
      queried = tokenHash;
      return context();
    },
    recordDownload: async () => undefined,
  };
  await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: allowedFetch([]),
    nowMs: NOW,
  });
  assert.equal(queried, hashDigitalDeliveryToken(RAW_TOKEN));
  assert.notEqual(queried, RAW_TOKEN);
});

test("download_count incrementado e first_downloaded_at só no primeiro download", async () => {
  const store = memoryDownloadStore([
    { ...context(), tokenHash: hashDigitalDeliveryToken(RAW_TOKEN) },
  ]);
  await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: allowedFetch([]),
    nowMs: NOW,
  });
  assert.equal(store.rows[0]?.downloadCount, 1);
  assert.equal(store.rows[0]?.firstDownloadedAt, new Date(NOW).toISOString());
  assert.equal(store.rows[0]?.lastDownloadedAt, new Date(NOW).toISOString());

  await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: allowedFetch([]),
    nowMs: NOW + 5_000,
  });
  assert.equal(store.rows[0]?.downloadCount, 2);
  assert.equal(store.rows[0]?.firstDownloadedAt, new Date(NOW).toISOString());
  assert.equal(store.rows[0]?.lastDownloadedAt, new Date(NOW + 5_000).toISOString());
});

test("falha de métricas não impede o arquivo nem vaza erro interno", async () => {
  const store: DigitalDeliveryDownloadStore = {
    findDownloadContextByTokenHash: async () => context(),
    recordDownload: async () => {
      throw new Error("metrics_down token=leak path=a-vida-e-um-dia-ebook.pdf");
    },
  };
  const result = await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: allowedFetch([]),
    nowMs: NOW,
  });
  assert.equal(result.kind, "file");
  const response = ebookDownloadToResponse(result);
  const serialized = JSON.stringify({ kind: result.kind, filename: result.kind === "file" ? result.filename : null });
  assert.equal(serialized.includes(RAW_TOKEN), false);
  assert.equal(serialized.includes("metrics_down"), false);
  assert.equal(response.headers.get("Location"), null);
});

test("token bruto não é persistido no store de download", async () => {
  const store = memoryDownloadStore([
    { ...context(), tokenHash: hashDigitalDeliveryToken(RAW_TOKEN) },
  ]);
  await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: allowedFetch([]),
    nowMs: NOW,
  });
  const persisted = JSON.stringify(store.rows);
  assert.equal(persisted.includes(RAW_TOKEN), false);
  assert.equal(persisted.includes("signed"), false);
});

test("resposta de erro é genérica e não inclui token, path ou URL de Storage", async () => {
  const denied = ebookDownloadToResponse({ kind: "denied" });
  const unavailable = ebookDownloadToResponse({ kind: "unavailable" });
  assert.equal(denied.status, 404);
  assert.equal(unavailable.status, 503);
  const deniedBody = await denied.json();
  const unavailableBody = await unavailable.json();
  assert.deepEqual(deniedBody, { ok: false, code: "NOT_FOUND" });
  assert.deepEqual(unavailableBody, { ok: false, code: "UNAVAILABLE" });
  assert.doesNotThrow(() => assertNoSensitiveFields(deniedBody));
  assert.doesNotThrow(() => assertNoSensitiveFields(unavailableBody));
  assert.equal(JSON.stringify(deniedBody).includes(RAW_TOKEN), false);
  assert.equal(JSON.stringify(deniedBody).toLowerCase().includes("ebooks"), false);
  assert.equal(JSON.stringify(unavailableBody).includes("a-vida-e-um-dia-ebook.pdf"), false);
});

test("PDF usa filename amigável e não redireciona para Storage público", async () => {
  const store = memoryDownloadStore([
    { ...context(), tokenHash: hashDigitalDeliveryToken(RAW_TOKEN) },
  ]);
  const objectPaths: string[] = [];
  const result = await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: allowedFetch(objectPaths),
    nowMs: NOW,
  });
  const response = ebookDownloadToResponse(result);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.equal(
    response.headers.get("Content-Disposition"),
    `attachment; filename="${EBOOK_DOWNLOAD_FILENAME}"`,
  );
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Location"), null);
  assert.deepEqual(objectPaths, ["a-vida-e-um-dia-ebook.pdf"]);
  assert.equal(EBOOK_STORAGE_BUCKET, "ebooks");
  assert.equal(isSafeEbookObjectPath("https://example.supabase.co/storage/v1/object/public/ebooks/x.pdf"), false);
});

test("arquivo ausente no Storage vira indisponível", async () => {
  const store = memoryDownloadStore([
    { ...context(), tokenHash: hashDigitalDeliveryToken(RAW_TOKEN) },
  ]);
  const result = await handleEbookDownload(RAW_TOKEN, {
    store,
    fetchEbookObject: async () => ({ ok: false }),
    nowMs: NOW,
  });
  assert.equal(result.kind, "unavailable");
});
