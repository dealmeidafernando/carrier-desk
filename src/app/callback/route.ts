import { NextRequest, NextResponse } from "next/server";
import {
  APP_ACCESS_TOKEN_MAX_AGE_SEC,
  APP_REFRESH_COOKIE_NAME,
  APP_TOKEN_COOKIE_NAME,
  appTokenCookieOptions,
  refreshCookieMaxAgeSec,
} from "@/lib/auth-cookies";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const refresh = request.nextUrl.searchParams.get("refresh");
  if (!token) {
    const destination = new URL("/login?error=missing_token", request.url);
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({
    name: APP_TOKEN_COOKIE_NAME,
    value: token,
    ...appTokenCookieOptions(APP_ACCESS_TOKEN_MAX_AGE_SEC),
  });
  if (refresh) {
    response.cookies.set({
      name: APP_REFRESH_COOKIE_NAME,
      value: refresh,
      ...appTokenCookieOptions(refreshCookieMaxAgeSec(refresh)),
    });
  }

  return response;
}
