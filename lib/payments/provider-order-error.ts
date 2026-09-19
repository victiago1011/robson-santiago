const STRUCTURED_ERROR_CODE = /^[a-z][a-z0-9_]*$/;

export type ProviderGetOrderClassification = "not_found" | "invalid_id" | "unavailable";

export function providerHttpStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

export function providerErrorName(error: unknown): string | null {
  if (error instanceof Error && error.name.trim()) {
    return error.name;
  }
  return null;
}

export function providerErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const record = error as { error?: unknown; code?: unknown; causes?: unknown };
  const candidates: unknown[] = [record.error, record.code];

  if (Array.isArray(record.causes)) {
    for (const cause of record.causes) {
      if (typeof cause === "object" && cause !== null && "code" in cause) {
        candidates.push((cause as { code?: unknown }).code);
      }
    }
  }

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    const code = candidate.trim();
    if (STRUCTURED_ERROR_CODE.test(code)) {
      return code;
    }
  }

  return null;
}

export function classifyGetOrderError(error: unknown): ProviderGetOrderClassification {
  const status = providerHttpStatus(error);
  const code = providerErrorCode(error);

  if (status === 404) {
    return "not_found";
  }

  if (status === 400 && code === "invalid_path_param") {
    return "invalid_id";
  }

  return "unavailable";
}

export function providerUnavailableLog(error: unknown): {
  code: "PROVIDER_UNAVAILABLE";
  providerHttpStatus: number | null;
  providerErrorName: string | null;
  providerErrorCode?: string;
} {
  const payload: {
    code: "PROVIDER_UNAVAILABLE";
    providerHttpStatus: number | null;
    providerErrorName: string | null;
    providerErrorCode?: string;
  } = {
    code: "PROVIDER_UNAVAILABLE",
    providerHttpStatus: providerHttpStatus(error),
    providerErrorName: providerErrorName(error),
  };
  const errorCode = providerErrorCode(error);
  if (errorCode) {
    payload.providerErrorCode = errorCode;
  }
  return payload;
}
