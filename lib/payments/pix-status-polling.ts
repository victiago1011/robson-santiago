import type { PublicPaymentStatus } from "@/lib/payments/public-payment-status";
import type { PurchaseKind } from "@/lib/commerce/selection";

export type CheckoutPaymentUiState =
  | "loading"
  | "ready"
  | "processing"
  | "awaiting_pix"
  | "approved"
  | "rejected"
  | "refunded"
  | "error";

export const PIX_STATUS_POLL_INTERVAL_MS = 2_500;
export const PIX_STATUS_POLL_TIMEOUT_MS = 10 * 60 * 1_000;

const TERMINAL_STATUSES = new Set<PublicPaymentStatus>([
  "approved",
  "rejected",
  "cancelled",
  "refunded",
]);

export function isTerminalPublicPaymentStatus(
  status: PublicPaymentStatus,
): status is "approved" | "rejected" | "cancelled" | "refunded" {
  return TERMINAL_STATUSES.has(status);
}

export function shouldStartPixStatusPolling(input: {
  method: "pix" | "credit_card" | null | undefined;
  uiState: CheckoutPaymentUiState;
  publicId: string | null | undefined;
}): boolean {
  return Boolean(input.publicId) && input.method === "pix" && input.uiState === "awaiting_pix";
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = "name" in error ? String(error.name) : "";
  return name === "AbortError";
}

export type PixStatusPollerOptions = {
  fetchStatus: (publicId: string, signal: AbortSignal) => Promise<PublicPaymentStatus>;
  onTerminal: (status: "approved" | "rejected" | "cancelled" | "refunded") => void;
  onTimeout: () => void;
  intervalMs?: number;
  timeoutMs?: number;
  now?: () => number;
  delay?: (ms: number, signal: AbortSignal) => Promise<void>;
};

function defaultDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    };
    signal.addEventListener("abort", onAbort);
  });
}

export function startPixStatusPolling(publicId: string, options: PixStatusPollerOptions): () => void {
  const intervalMs = options.intervalMs ?? PIX_STATUS_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? PIX_STATUS_POLL_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const delay = options.delay ?? defaultDelay;
  const startedAt = now();
  const controller = new AbortController();
  let stopped = false;
  let inFlight = false;

  const stop = () => {
    stopped = true;
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  const timedOut = () => now() - startedAt >= timeoutMs;

  const run = async () => {
    while (!stopped) {
      if (timedOut()) {
        stop();
        options.onTimeout();
        return;
      }
      if (inFlight) {
        return;
      }
      inFlight = true;
      try {
        const status = await options.fetchStatus(publicId, controller.signal);
        if (stopped) {
          return;
        }
        if (isTerminalPublicPaymentStatus(status)) {
          stop();
          options.onTerminal(status);
          return;
        }
      } catch (error) {
        if (stopped || controller.signal.aborted || isAbortError(error)) {
          return;
        }
      } finally {
        inFlight = false;
      }

      if (stopped) {
        return;
      }
      if (timedOut()) {
        stop();
        options.onTimeout();
        return;
      }
      try {
        await delay(intervalMs, controller.signal);
      } catch {
        return;
      }
    }
  };

  void run();
  return stop;
}

export function digitalApprovedCopy() {
  return {
    title: "Pagamento aprovado!",
    confirmed: "Seu pagamento foi confirmado.",
    emailNotice: "Enviamos para o seu e-mail o acesso ao e-book “A Vida é um Dia”.",
    ctaHref: "/livro",
    ctaLabel: "Voltar para o livro",
    showDownload: false as const,
  };
}

export function approvedPaymentCopy(kind: PurchaseKind) {
  if (kind === "digital") {
    return digitalApprovedCopy();
  }
  return {
    title: "Pagamento aprovado!",
    confirmed: "Seu pagamento foi confirmado.",
    emailNotice: null,
    ctaHref: "/livro",
    ctaLabel: "Voltar para o livro",
    showDownload: false as const,
  };
}

export function checkoutShowsPixAwaiting(uiState: CheckoutPaymentUiState): boolean {
  return uiState === "awaiting_pix";
}

export const PIX_POLL_TIMEOUT_MESSAGE =
  "A confirmação pode levar mais alguns instantes. Se o pagamento já foi feito, o acesso também será enviado por e-mail.";

export const PIX_REFUNDED_MESSAGE = "Este pagamento foi estornado.";

const publicStatusSet = new Set<string>([
  "pending",
  "in_process",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
]);

export function readPublicPaymentStatusPayload(data: unknown): PublicPaymentStatus {
  if (
    typeof data === "object" &&
    data !== null &&
    "ok" in data &&
    data.ok === true &&
    "status" in data &&
    typeof data.status === "string" &&
    publicStatusSet.has(data.status)
  ) {
    return data.status as PublicPaymentStatus;
  }
  throw new Error("STATUS_UNAVAILABLE");
}

export async function fetchCheckoutPaymentStatus(
  publicId: string,
  signal: AbortSignal,
): Promise<PublicPaymentStatus> {
  const response = await fetch(`/api/orders/${encodeURIComponent(publicId)}/payment-status`, {
    method: "GET",
    signal,
  });
  if (!response.ok) {
    throw new Error("STATUS_UNAVAILABLE");
  }
  return readPublicPaymentStatusPayload(await response.json());
}
