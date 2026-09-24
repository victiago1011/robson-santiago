import { NextResponse, type NextRequest } from "next/server";
import { refreshAuthSession } from "@/lib/admin/auth-api";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ADMIN_REFRESH_MAX_AGE_SECONDS,
  accessTokenNeedsRefresh,
  decideAdminProxy,
  sessionCookieOptions,
} from "@/lib/admin/session-token";

function clearSession(response: NextResponse) {
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", sessionCookieOptions(0));
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", sessionCookieOptions(0));
  return response;
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return clearSession(NextResponse.redirect(url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/pedido/acompanhar/")) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const accessToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  const refreshToken = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value ?? "";
  const hasUsableAccessToken = Boolean(accessToken) && !accessTokenNeedsRefresh(accessToken);

  const decision = decideAdminProxy({
    pathname,
    hasUsableAccessToken,
    hasRefreshToken: Boolean(refreshToken),
  });

  if (decision === "continue" || decision === "api-anonymous") {
    return NextResponse.next();
  }

  if (decision === "redirect-login") {
    return loginRedirect(request);
  }

  const session = await refreshAuthSession(refreshToken);
  if (!session) {
    if (pathname.startsWith("/api/admin")) {
      return clearSession(NextResponse.next());
    }
    return loginRedirect(request);
  }

  const response = NextResponse.next();
  response.cookies.set(
    ADMIN_ACCESS_COOKIE,
    session.accessToken,
    sessionCookieOptions(session.expiresIn),
  );
  response.cookies.set(
    ADMIN_REFRESH_COOKIE,
    session.refreshToken,
    sessionCookieOptions(ADMIN_REFRESH_MAX_AGE_SECONDS),
  );
  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/pedido/acompanhar/:path*",
  ],
};
