import { NextRequest, NextResponse } from "next/server";
import {
  APP_REFRESH_COOKIE_NAME,
  APP_TOKEN_COOKIE_NAME,
  appTokenCookieOptions,
} from "@/lib/auth-cookies";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set({
    name: APP_TOKEN_COOKIE_NAME,
    value: "",
    ...appTokenCookieOptions(0),
  });
  response.cookies.set({
    name: APP_REFRESH_COOKIE_NAME,
    value: "",
    ...appTokenCookieOptions(0),
  });
  return response;
}
