import { NextResponse } from "next/server";
import {
  APP_ACCESS_TOKEN_MAX_AGE_SEC,
  APP_REFRESH_COOKIE_NAME,
  APP_TOKEN_COOKIE_NAME,
  appTokenCookieOptions,
  refreshCookieMaxAgeSec,
} from "@/lib/auth-cookies";
import { getAppRefreshToken, refreshAppTokenPair } from "@/lib/auth";

export async function POST() {
  const refreshToken = await getAppRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
  }

  const pair = await refreshAppTokenPair(refreshToken);
  if (!pair) {
    return NextResponse.json(
      { error: "Invalid or expired refresh token" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
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
