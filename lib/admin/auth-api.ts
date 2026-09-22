export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
};

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  user?: { id?: unknown };
};

function authConfig(): { url: string; publishableKey: string } | null {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    return null;
  }
  return { url: url.replace(/\/$/, ""), publishableKey };
}

export function isAdminAuthConfigured(): boolean {
  return authConfig() !== null;
}

function readSession(payload: TokenResponse): AuthSession | null {
  if (
    typeof payload.access_token !== "string" ||
    typeof payload.refresh_token !== "string" ||
    typeof payload.expires_in !== "number" ||
    typeof payload.user?.id !== "string"
  ) {
    return null;
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in,
    userId: payload.user.id,
  };
}

async function postToken(
  grantType: "password" | "refresh_token",
  body: Record<string, string>,
): Promise<AuthSession | null> {
  const config = authConfig();
  if (!config) {
    return null;
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=${grantType}`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return readSession((await response.json()) as TokenResponse);
}

export function signInWithPassword(email: string, password: string): Promise<AuthSession | null> {
  return postToken("password", { email, password });
}

export function refreshAuthSession(refreshToken: string): Promise<AuthSession | null> {
  return postToken("refresh_token", { refresh_token: refreshToken });
}

export async function fetchAuthUserId(accessToken: string): Promise<string | null> {
  const config = authConfig();
  if (!config || !accessToken) {
    return null;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { id?: unknown };
  return typeof payload.id === "string" ? payload.id : null;
}
