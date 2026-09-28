import { NextRequest, NextResponse } from "next/server";
import {
  APP_ACCESS_TOKEN_MAX_AGE_SEC,
  APP_REFRESH_COOKIE_NAME,
  APP_TOKEN_COOKIE_NAME,
  appTokenCookieOptions,
  readJwtExpSeconds,
  refreshCookieMaxAgeSec,
} from "@/lib/auth-cookies";

const PUBLIC_PREFIXES = [
  "/login",
  "/logout",
  "/callback",
  "/api/auth/refresh",
  "/api/health",
];

const REFRESH_AHEAD_SEC = 120;

function deny(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

async function mintRefreshedPair(
  refreshToken: string,
  platformUrl: string
): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const minted = await fetch(
      `${platformUrl.replace(/\/$/, "")}/api/apps/auth/refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
        cache: "no-store",
      }
    );
    if (!minted.ok) {
      return null;
    }

    const body = (await minted.json()) as {
      token?: string;
      refresh_token?: string;
    };
    if (!body.token || !body.refresh_token) {
      return null;
    }
    return { token: body.token, refreshToken: body.refresh_token };
  } catch {
    return null;
  }
}

function nextWithAppCookies(
  request: NextRequest,
  pair: { token: string; refreshToken: string }
): NextResponse {
  const cookieMap = new Map(
    request.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
  );
  cookieMap.set(APP_TOKEN_COOKIE_NAME, pair.token);
  cookieMap.set(APP_REFRESH_COOKIE_NAME, pair.refreshToken);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "cookie",
    Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ")
  );

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.cookies.set({
    name: APP_TOKEN_COOKIE_NAME,
    value: pair.token,
    ...appTokenCookieOptions(APP_ACCESS_TOKEN_MAX_AGE_SEC),
  });
  response.cookies.set({
    name: APP_REFRESH_COOKIE_NAME,
    value: pair.refreshToken,
    ...appTokenCookieOptions(refreshCookieMaxAgeSec(pair.refreshToken)),
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(APP_TOKEN_COOKIE_NAME)?.value;
  const exp = accessToken ? readJwtExpSeconds(accessToken) : null;
  const accessTtlSec = exp === null ? 0 : exp - Math.floor(Date.now() / 1000);
  if (accessTtlSec >= REFRESH_AHEAD_SEC) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(APP_REFRESH_COOKIE_NAME)?.value;
  const platformUrl = process.env.HR_PLATFORM_URL?.trim();
  if (refreshToken && platformUrl) {
    const pair = await mintRefreshedPair(refreshToken, platformUrl);
    if (pair) {
      return nextWithAppCookies(request, pair);
    }
  }

  return accessTtlSec > 0 ? NextResponse.next() : deny(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
