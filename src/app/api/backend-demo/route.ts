import { NextRequest, NextResponse } from "next/server";
import { callBackendDemo } from "@/lib/backend-demo";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as
    | { endpoint?: string; apiKey?: string }
    | null;

  const endpoint = payload?.endpoint?.trim();
  const apiKey = payload?.apiKey?.trim();

  if (!endpoint) {
    return NextResponse.json(
      { error: "endpoint is required" },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "apiKey is required" },
      { status: 400 }
    );
  }

  try {
    const result = await callBackendDemo({ endpoint, apiKey });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Backend request failed.",
      },
      { status: 503 }
    );
  }
}
