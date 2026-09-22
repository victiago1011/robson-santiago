export const ADMIN_ACCESS_COOKIE = "rs_admin_access";
export const ADMIN_REFRESH_COOKIE = "rs_admin_refresh";

export const ADMIN_REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const REFRESH_SKEW_MS = 60_000;

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function decodeJwtExp(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) {
    return null;
  }

  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Presentation-only expiry check. Identity still comes from Supabase Auth. */
export function accessTokenNeedsRefresh(token: string, nowMs = Date.now()): boolean {
  const exp = decodeJwtExp(token);
  if (exp === null) {
    return true;
  }
  return exp * 1000 <= nowMs + REFRESH_SKEW_MS;
}

export type AdminProxyDecision = "continue" | "refresh" | "redirect-login" | "api-anonymous";

export function decideAdminProxy(input: {
  pathname: string;
  hasUsableAccessToken: boolean;
  hasRefreshToken: boolean;
}): AdminProxyDecision {
  if (input.pathname === "/admin/login" || input.pathname.startsWith("/admin/login/")) {
    return "continue";
  }

  if (input.hasUsableAccessToken) {
    return "continue";
  }

  if (input.hasRefreshToken) {
    return "refresh";
  }

  if (input.pathname.startsWith("/api/admin")) {
    return "api-anonymous";
  }

  return "redirect-login";
}
