import { type NextRequest } from "next/server";

/** Resolve the external origin from proxy headers, falling back to request URL. */
export function getExternalOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}
