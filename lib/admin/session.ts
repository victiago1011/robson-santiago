import "server-only";

import { cookies } from "next/headers";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ADMIN_REFRESH_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/admin/session-token";
import type { AuthSession } from "@/lib/admin/auth-api";

export async function writeAuthCookies(session: AuthSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_ACCESS_COOKIE,
    session.accessToken,
    sessionCookieOptions(session.expiresIn),
  );
  cookieStore.set(
    ADMIN_REFRESH_COOKIE,
    session.refreshToken,
    sessionCookieOptions(ADMIN_REFRESH_MAX_AGE_SECONDS),
  );
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_ACCESS_COOKIE);
  cookieStore.delete(ADMIN_REFRESH_COOKIE);
}

export async function readAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value?.trim();
  return token ? token : null;
}
