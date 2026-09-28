import { ensureAppToken, getAppToken } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";

export interface TwinRequestOptions {
  params?: Record<string, string>;
  headers?: HeadersInit;
}

export interface OpenAPISpec {
  paths: Record<string, Record<string, unknown>>;
  definitions?: Record<
    string,
    {
      type: string;
      properties?: Record<
        string,
        { type?: string; format?: string; description?: string }
      >;
      required?: string[];
    }
  >;
  info?: { title?: string; description?: string };
}

async function twinFetch(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> {
  const { orgId, twinGateway } = getPublicEnv();
  if (!twinGateway) {
    throw new Error("NEXT_PUBLIC_TWIN_GATEWAY is not configured.");
  }

  const url = new URL(path.replace(/^\//, ""), `${twinGateway.replace(/\/$/, "")}/`);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("x-org-id", orgId);

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function fetchTwin(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let token = await getAppToken();
  if (!token) {
    token = await ensureAppToken();
  }
  if (!token) {
    throw new Error("Missing HappyRobot app token.");
  }

  const response = await twinFetch(path, token, init);
  if (response.status !== 401) {
    return response;
  }

  // Access may have expired mid-request; refresh once and retry.
  const refreshed = await ensureAppToken();
  if (!refreshed || refreshed === token) {
    return response;
  }
  return twinFetch(path, refreshed, init);
}

export async function getTwinSchema(): Promise<OpenAPISpec> {
  const response = await fetchTwin("/");
  if (!response.ok) {
    throw new Error(`Twin schema request failed (${response.status}).`);
  }

  return (await response.json()) as OpenAPISpec;
}

export async function getTwinRows<T = Record<string, unknown>[]>(
  table: string,
  options: TwinRequestOptions = {}
): Promise<T> {
  const search = new URLSearchParams(options.params);
  const path = search.size ? `/${table}?${search.toString()}` : `/${table}`;
  const response = await fetchTwin(path, {
    headers: options.headers,
  });

  if (!response.ok) {
    throw new Error(`Twin table request failed for ${table} (${response.status}).`);
  }

  return (await response.json()) as T;
}
