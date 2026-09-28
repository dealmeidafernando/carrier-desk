type BackendDemoInput = {
  endpoint: string;
  apiKey: string;
};

export async function callBackendDemo({
  endpoint,
  apiKey,
}: BackendDemoInput) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Enter a valid http or https URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https endpoints are supported.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
      accept: "application/json,text/plain,*/*",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    responsePreview: body.slice(0, 1_200) || "The backend returned an empty response.",
  };
}
