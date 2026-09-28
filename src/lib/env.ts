export function getPublicEnv() {
  return {
    orgId: process.env.NEXT_PUBLIC_ORG_ID?.trim() ?? "",
    appSlug: process.env.NEXT_PUBLIC_APP_SLUG?.trim() ?? "",
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() ?? "",
    appDescription: process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() ?? "",
    twinGateway: process.env.NEXT_PUBLIC_TWIN_GATEWAY?.trim() ?? "",
  };
}

export function getServerEnv() {
  return {
    platformUrl: process.env.HR_PLATFORM_URL?.trim() ?? "",
  };
}
