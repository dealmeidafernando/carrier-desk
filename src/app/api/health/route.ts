import { NextResponse } from "next/server";
import { getPublicEnv, getServerEnv } from "@/lib/env";

export async function GET() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  return NextResponse.json({
    ok: true,
    orgId: publicEnv.orgId,
    twinGatewayConfigured: Boolean(publicEnv.twinGateway),
    platformConfigured: Boolean(serverEnv.platformUrl),
  });
}
