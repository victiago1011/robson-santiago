import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  approvedPaymentCopy,
  checkoutShowsPixAwaiting,
  PIX_POLL_TIMEOUT_MESSAGE,
  PIX_STATUS_POLL_INTERVAL_MS,
  PIX_STATUS_POLL_TIMEOUT_MS,
  readPublicPaymentStatusPayload,
  shouldStartPixStatusPolling,
  startPixStatusPolling,
} from "@/lib/payments/pix-status-polling";
import type { PublicPaymentStatus } from "@/lib/payments/public-payment-status";

const PUBLIC_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function waitMicrotask() {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

async function waitFor(predicate: () => boolean) {
  for (let i = 0; i < 30; i += 1) {
    if (predicate()) {
      return;
    }
    await waitMicrotask();
  }
  throw new Error("condition not met");
}

function createDelayQueue() {
  const pending: Array<{ resolve: () => void }> = [];
  const delay = async (_ms: number, signal: AbortSignal) => {
    if (signal.aborted) {
      throw Object.assign(new Error("Aborted"), { name: "AbortError" });
    }
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener("abort", onAbort);
        reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      };
      signal.addEventListener("abort", onAbort);
      pending.push({
        resolve: () => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        },
      });
    });
  };
  return {
    delay,
    async flush() {
      const next = pending.shift();
      next?.resolve();
      await waitMicrotask();
    },
    size() {
      return pending.length;
    },
  };
}

function createPollerHarness(options?: {
  statuses?: Array<PublicPaymentStatus | Error>;
  timeoutMs?: number;
  now?: () => number;
}) {
  const delay = createDelayQueue();
  const calls: string[] = [];
  const terminals: string[] = [];
  const timeouts: number[] = [];
  const queue = [...(options?.statuses ?? ["pending"])];
  let inFlight = 0;
  let maxInFlight = 0;

  const stop = startPixStatusPolling(PUBLIC_ID, {
    timeoutMs: options?.timeoutMs ?? PIX_STATUS_POLL_TIMEOUT_MS,
    intervalMs: PIX_STATUS_POLL_INTERVAL_MS,
    now: options?.now,
    delay: delay.delay,
    fetchStatus: async (publicId) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      calls.push(publicId);
      const next = queue.shift() ?? "pending";
      await waitMicrotask();
      inFlight -= 1;
      if (next instanceof Error) {
        throw next;
      }
      return next;
    },
    onTerminal: (status) => {
      terminals.push(status);
    },
    onTimeout: () => {
      timeouts.push(1);
    },
  });

  return { stop, delay, calls, terminals, timeouts, maxInFlight: () => maxInFlight };
}

test("não inicia polling sem publicId nem para cartão", () => {
  assert.equal(
    shouldStartPixStatusPolling({ method: "pix", uiState: "awaiting_pix", publicId: null }),
    false,
  );
  assert.equal(
    shouldStartPixStatusPolling({
      method: "credit_card",
      uiState: "awaiting_pix",
      publicId: PUBLIC_ID,
    }),
    false,
  );
  assert.equal(
    shouldStartPixStatusPolling({
      method: "pix",
      uiState: "approved",
      publicId: PUBLIC_ID,
    }),
    false,
  );
  assert.equal(
    shouldStartPixStatusPolling({
      method: "pix",
      uiState: "awaiting_pix",
      publicId: PUBLIC_ID,
    }),
    true,
  );
});

test("GET imediato e continua em pending/in_process", async () => {
  const harness = createPollerHarness({ statuses: ["pending", "in_process", "pending"] });
  await waitFor(() => harness.calls.length === 1 && harness.delay.size() === 1);
  assert.deepEqual(harness.calls, [PUBLIC_ID]);
  assert.deepEqual(harness.terminals, []);
  await harness.delay.flush();
  await waitFor(() => harness.calls.length === 2);
  await waitFor(() => harness.delay.size() === 1);
  await harness.delay.flush();
  await waitFor(() => harness.calls.length === 3);
  assert.equal(harness.maxInFlight(), 1);
  harness.stop();
});

test("approved encerra polling", async () => {
  const harness = createPollerHarness({ statuses: ["approved", "pending"] });
  await waitFor(() => harness.terminals.length === 1);
  assert.deepEqual(harness.terminals, ["approved"]);
  assert.equal(harness.calls.length, 1);
  await harness.delay.flush();
  assert.equal(harness.calls.length, 1);
  harness.stop();
});

test("rejected cancelled refunded encerram polling", async () => {
  for (const status of ["rejected", "cancelled", "refunded"] as const) {
    const harness = createPollerHarness({ statuses: [status, "pending"] });
    await waitFor(() => harness.terminals.length === 1);
    assert.deepEqual(harness.terminals, [status]);
    await harness.delay.flush();
    assert.equal(harness.calls.length, 1);
    harness.stop();
  }
});

test("timeout encerra sem tratar como rejeitado", async () => {
  let current = 0;
  const harness = createPollerHarness({
    statuses: ["pending"],
    timeoutMs: 10,
    now: () => current,
  });
  await waitFor(() => harness.delay.size() === 1);
  current = 10;
  await harness.delay.flush();
  await waitFor(() => harness.timeouts.length === 1);
  assert.deepEqual(harness.terminals, []);
  harness.stop();
});

test("erro transitório não vira rejected e continua até approved", async () => {
  const harness = createPollerHarness({
    statuses: [new Error("network"), "approved"],
  });
  await waitFor(() => harness.delay.size() === 1);
  assert.deepEqual(harness.terminals, []);
  await harness.delay.flush();
  await waitFor(() => harness.terminals[0] === "approved");
  harness.stop();
});

test("cleanup impede novas consultas após unmount", async () => {
  const harness = createPollerHarness({ statuses: ["pending", "approved"] });
  await waitFor(() => harness.delay.size() === 1);
  harness.stop();
  await harness.delay.flush();
  await waitMicrotask();
  assert.equal(harness.calls.length, 1);
  assert.deepEqual(harness.terminals, []);
});

test("QR some no approved e copy de e-book não tem download", () => {
  const copy = approvedPaymentCopy("digital");
  assert.equal(copy.title, "Pagamento aprovado!");
  assert.equal(copy.confirmed, "Seu pagamento foi confirmado.");
  assert.equal(copy.emailNotice, "Enviamos para o seu e-mail o acesso ao e-book “A Vida é um Dia”.");
  assert.equal(copy.ctaHref, "/livro");
  assert.equal(copy.ctaLabel, "Voltar para o livro");
  assert.equal(copy.showDownload, false);
  assert.equal(checkoutShowsPixAwaiting("approved"), false);
  assert.equal(checkoutShowsPixAwaiting("awaiting_pix"), true);
  assert.equal(checkoutShowsPixAwaiting("refunded"), false);
});

test("UI de checkout substitui o Pix pela confirmação no approved", () => {
  const approved = readFileSync(join(process.cwd(), "components", "checkout", "PaymentApproved.tsx"), "utf8");
  const section = readFileSync(join(process.cwd(), "components", "checkout", "PaymentSection.tsx"), "utf8");
  const pix = readFileSync(join(process.cwd(), "components", "checkout", "PixAwaiting.tsx"), "utf8");
  const form = readFileSync(join(process.cwd(), "components", "checkout", "CheckoutForm.tsx"), "utf8");

  assert.equal(approved.includes('href={copy.ctaHref}'), true);
  assert.equal(approved.includes("/livro"), false);
  assert.equal(approved.includes("download"), false);
  assert.equal(section.includes("<PaymentApproved"), true);
  assert.equal(section.includes("uiState === \"approved\""), true);
  assert.equal(section.includes("checkoutShowsPixAwaiting"), true);
  assert.equal(pix.includes("Copiar código Pix"), true);
  assert.equal(pix.includes(PIX_POLL_TIMEOUT_MESSAGE) || section.includes("PIX_POLL_TIMEOUT_MESSAGE"), true);
  assert.equal(form.includes("sessionStorage"), false);
  assert.equal(form.includes("localStorage"), false);
  assert.equal(form.includes("fetchCheckoutPaymentStatus"), true);
  assert.equal(form.includes("shouldStartPixStatusPolling"), true);
});

test("payload de status lê o contrato mínimo", () => {
  assert.equal(readPublicPaymentStatusPayload({ ok: true, status: "pending" }), "pending");
  assert.equal(
    readPublicPaymentStatusPayload({ ok: true, status: "approved" }),
    "approved",
  );
  assert.throws(() => readPublicPaymentStatusPayload({ ok: false, status: "approved" }));
});
