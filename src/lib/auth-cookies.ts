export const APP_TOKEN_COOKIE_NAME = "hr_token";
export const APP_REFRESH_COOKIE_NAME = "hr_refresh";

export const APP_ACCESS_TOKEN_MAX_AGE_SEC = 15 * 60;
export const APP_REFRESH_TOKEN_MAX_AGE_SEC = 3 * 24 * 60 * 60;

export function appTokenCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function readJwtExpSeconds(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function refreshCookieMaxAgeSec(refreshToken: string): number {
  const exp = readJwtExpSeconds(refreshToken);
  if (exp === null) return APP_REFRESH_TOKEN_MAX_AGE_SEC;
  return Math.max(exp - Math.floor(Date.now() / 1000), 0);
}
