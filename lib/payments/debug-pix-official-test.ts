import { randomUUID, timingSafeEqual } from "node:crypto";
import { getMercadoPagoAccessToken, isMercadoPagoTestAccessToken } from "@/lib/payments/config";

export const OFFICIAL_PIX_TEST_ORDER_BODY = {
  type: "online",
  external_reference: "ext_ref_1234",
  total_amount: "50.00",
  payer: {
    email: "test_user_br@testuser.com",
    first_name: "APRO",
  },
  transactions: {
    payments: [
      {
        amount: "50.00",
        payment_method: {
          id: "pix",
          type: "bank_transfer",
        },
      },
    ],
  },
} as const;

export const DEBUG_PIX_WAIT_MS = 8_000;
const ORDERS_URL = "https://api.mercadopago.com/v1/orders";

export type DebugPixSnapshot = {
  httpStatus: number;
  orderId: string | null;
  orderStatus: string | null;
  orderStatusDetail: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  paymentStatusDetail: string | null;
};

export type DebugPixSuccess = {
  ok: true;
  status: number;
  body: {
    create: Omit<DebugPixSnapshot, "httpStatus"> & { httpStatus: number };
    afterWait: {
      httpStatus: number;
      orderStatus: string | null;
      orderStatusDetail: string | null;
      paymentStatus: string | null;
      paymentStatusDetail: string | null;
    };
  };
};

export type DebugPixFailure = {
  ok: false;
  status: number;
  body: {
    httpStatus: number;
    error: string;
    message: string;
  };
};

export type DebugPixResult = DebugPixSuccess | DebugPixFailure;

type MercadoPagoJson = {
  id?: unknown;
  status?: unknown;
  status_detail?: unknown;
  error?: unknown;
  message?: unknown;
  cause?: unknown;
  transactions?: {
    payments?: Array<{
      id?: unknown;
      status?: unknown;
      status_detail?: unknown;
    }>;
  };
};

function secretsMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(received, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function snapshotFromOrder(httpStatus: number, payload: MercadoPagoJson | null): DebugPixSnapshot {
  const payment = payload?.transactions?.payments?.[0];
  return {
    httpStatus,
    orderId: asText(payload?.id),
    orderStatus: asText(payload?.status),
    orderStatusDetail: asText(payload?.status_detail),
    paymentId: asText(payment?.id),
    paymentStatus: asText(payment?.status),
    paymentStatusDetail: asText(payment?.status_detail),
  };
}

function sanitizeErrorMessage(value: unknown): string {
  const text = asText(value) ?? "request_failed";
  return text.replace(/TEST-[A-Za-z0-9._-]+/g, "[redacted]").replace(/APP_USR-[A-Za-z0-9._-]+/g, "[redacted]");
}

function errorFromMercadoPago(httpStatus: number, payload: MercadoPagoJson | null): DebugPixFailure {
  const cause =
    Array.isArray(payload?.cause) && payload.cause[0] && typeof payload.cause[0] === "object"
      ? (payload.cause[0] as { code?: unknown; description?: unknown })
      : null;
  return {
    ok: false,
    status: httpStatus >= 400 ? httpStatus : 502,
    body: {
      httpStatus,
      error: asText(payload?.error) ?? asText(cause?.code) ?? "mercadopago_error",
      message: sanitizeErrorMessage(payload?.message ?? cause?.description),
    },
  };
}

async function readJson(response: Response): Promise<MercadoPagoJson | null> {
  try {
    return (await response.json()) as MercadoPagoJson;
  } catch {
    return null;
  }
}

export function authorizeDebugPixRequest(
  request: Request,
  env: NodeJS.Dict<string> = process.env,
): DebugPixFailure | { ok: true; accessToken: string } {
  const debugSecret = env.DEBUG_MERCADO_PAGO_SECRET?.trim();
  if (!debugSecret) {
    return {
      ok: false,
      status: 503,
      body: { httpStatus: 503, error: "DEBUG_NOT_CONFIGURED", message: "debug secret missing" },
    };
  }

  const provided = extractBearerToken(request.headers.get("authorization"));
  if (!provided || !secretsMatch(debugSecret, provided)) {
    return {
      ok: false,
      status: 401,
      body: { httpStatus: 401, error: "UNAUTHORIZED", message: "invalid debug secret" },
    };
  }

  const accessToken = env.MERCADO_PAGO_ACCESS_TOKEN?.trim() ?? "";
  if (!accessToken) {
    return {
      ok: false,
      status: 503,
      body: { httpStatus: 503, error: "MERCADO_PAGO_NOT_CONFIGURED", message: "access token missing" },
    };
  }

  if (!isMercadoPagoTestAccessToken(accessToken)) {
    return {
      ok: false,
      status: 403,
      body: { httpStatus: 403, error: "FORBIDDEN", message: "test credentials required" },
    };
  }

  return { ok: true, accessToken: getMercadoPagoAccessToken(env) };
}

export async function runOfficialPixDiagnostic(
  request: Request,
  env: NodeJS.Dict<string> = process.env,
  deps?: {
    fetchImpl?: typeof fetch;
    waitMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<DebugPixResult> {
  const authorized = authorizeDebugPixRequest(request, env);
  if (!authorized.ok) {
    return authorized;
  }

  const fetchImpl = deps?.fetchImpl ?? fetch;
  const waitMs = deps?.waitMs ?? DEBUG_PIX_WAIT_MS;
  const sleep =
    deps?.sleep ??
    (async (ms: number) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });

  const createResponse = await fetchImpl(ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authorized.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(OFFICIAL_PIX_TEST_ORDER_BODY),
  });
  const createPayload = await readJson(createResponse);
  if (!createResponse.ok) {
    return errorFromMercadoPago(createResponse.status, createPayload);
  }

  const create = snapshotFromOrder(createResponse.status, createPayload);
  if (!create.orderId) {
    return {
      ok: false,
      status: 502,
      body: { httpStatus: createResponse.status, error: "missing_order_id", message: "order id missing" },
    };
  }

  await sleep(waitMs);

  const getResponse = await fetchImpl(`${ORDERS_URL}/${encodeURIComponent(create.orderId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authorized.accessToken}`,
    },
  });
  const getPayload = await readJson(getResponse);
  if (!getResponse.ok) {
    return errorFromMercadoPago(getResponse.status, getPayload);
  }

  const after = snapshotFromOrder(getResponse.status, getPayload);
  return {
    ok: true,
    status: 200,
    body: {
      create: {
        httpStatus: create.httpStatus,
        orderId: create.orderId,
        orderStatus: create.orderStatus,
        orderStatusDetail: create.orderStatusDetail,
        paymentId: create.paymentId,
        paymentStatus: create.paymentStatus,
        paymentStatusDetail: create.paymentStatusDetail,
      },
      afterWait: {
        httpStatus: after.httpStatus,
        orderStatus: after.orderStatus,
        orderStatusDetail: after.orderStatusDetail,
        paymentStatus: after.paymentStatus,
        paymentStatusDetail: after.paymentStatusDetail,
      },
    },
  };
}
