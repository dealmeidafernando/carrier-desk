# custom-app-template-nextjs

Minimal HappyRobot custom app template built with Next.js App Router.

## Env vars

```bash
HR_PLATFORM_URL=https://preview.app.happyrobot.ai
NEXT_PUBLIC_ORG_ID=org_123
NEXT_PUBLIC_APP_SLUG=my-custom-app
NEXT_PUBLIC_APP_NAME="My Custom App"
NEXT_PUBLIC_APP_DESCRIPTION="A custom app for my HappyRobot workspace."
NEXT_PUBLIC_TWIN_GATEWAY=https://twin.example.com
```

## Local development

```bash
npm install
npm run dev
```

The sandbox runtime writes both `.env` and `.env.local`, so this template works in the existing dev sandbox without extra setup.

## Auth flow

- `/login` redirects to `HR_PLATFORM_URL/api/apps/auth`
- `/callback` receives the app token and stores it in an `HttpOnly` cookie
- server components, route handlers, and server actions read the cookie server-side

## What this template includes

- HappyRobot auth broker integration
- client -> route handler -> external API demo
- Twin-compatible server fetch helper using `Authorization` and `x-org-id`
- no Supabase and no separate backend service
