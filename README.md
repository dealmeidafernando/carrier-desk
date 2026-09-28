# Carrier Desk

Ops console for **Riley**, the inbound carrier-sales voice agent of HappyRobot Logistics. It is a [HappyRobot App](https://docs.happyrobot.ai/apps/overview) (Next.js App Router), and it reads and writes the same Twin tables the agent's API writes to (`carrier-sales-api`).

It shows signals and actions, never raw platform logs.

| Page | What the ops manager gets |
| --- | --- |
| **Overview** `/` | KPIs (conversion, margin kept under MAX_BUY, ceiling breaches = 0, rounds, lift over the posted rate, call length, AI outcome audit), the funnel from call to booking, how calls ended, unmet lane demand, integration health, and the **kill switch** |
| **Live call** `/live` | The call in progress, refreshed every 2 s from Twin: progress through the API's state machine, a feed of every tool call (FMCSA check, code, searches, each counter, booking), the deal against the hidden ceiling, and the loads pitched. `/live?call=<id>` replays any past call |
| **Calls** `/calls` | Every call with carrier, MC, outcome, load, offer → agreed, rounds, sentiment, a **Replay** link to the Live view, and a link to the HappyRobot run. Flags calls where the post-call AI classifier disagrees with the API |
| **Rep queue** `/queue` | Loads the agent booked, waiting for a senior rep: **Confirm**, **Call back** or **Release** |

## How it works

```
Voice agent ──webhooks──▶ carrier-sales-api ──writes──▶ Twin (calls, call_events, negotiation_rounds, handoff_queue)
                                  ▲                          │
                 reads kill switch│                          │ PostgREST gateway
                                  │                          ▼
                          agent_settings ◀──writes── Carrier Desk (this app)
```

- **Auth.** The template's HappyRobot sign-in (`hr_token` cookie, refreshed by `middleware.ts`). Every page and server action calls `requireAppUser()`.
- **Twin access is server-only.** Pages are server components and actions are server actions. They call the gateway through `fetchTwin` with the signed-in user's token and `x-org-id`, and nothing is fetched from the browser. The docs warn that the gateway is bound to the org by a header, so this matters.
- **Metrics** are pure functions over Twin rows (`src/lib/desk/metrics.ts`). Each one can be checked with a SQL query in the Twin console.
- **Actions are audited.** Each rep decision writes a `rep_decision` row to `call_events` with the rep's email. A decision only applies to an open handoff, so two reps can't overwrite each other.
- **Kill switch.** Pausing sets `agent_settings.kill_switch = {"paused": true, "by", "at"}`. The API checks it at the first tool call (`verify_carrier`) and returns `desk_unavailable`. The agent then tells the caller a rep will call back, without sending a code or quoting a load.
- **Release** marks the handoff released. The TMS protocol has no cancel command (only `LOAD_QUERY`, `LOAD_GET` and `LOAD_BOOK`), so the booking also has to be cancelled in the TMS. The UI says so before confirming.

## Code

```
src/lib/desk/
  types.ts      Twin row shapes (as written by carrier-sales-api)
  data.ts       loaders: PostgREST selects with a time-range filter
  metrics.ts    funnel, KPIs, outcomes, lane demand, health (pure)
  format.ts     money, %, durations, Central-time timestamps, outcome labels
  actions.ts    server actions: decideHandoff, setAgentPaused
src/components/desk/   stat tile, bar list, outcome badge, range filter, kill switch, handoff actions
src/app/{page,calls/page,queue/page}.tsx
```

## Develop and deploy

```bash
npm install
npm run dev        # needs .env.local (HR_PLATFORM_URL, NEXT_PUBLIC_ORG_ID, NEXT_PUBLIC_TWIN_GATEWAY)
npm run build      # also type-checks
```

The platform's managed repo isn't reachable from a personal GitHub account, so this repo is the source of truth. Deploy by syncing it into the App's sandbox:

1. Push to `main` here.
2. In the App's sandbox terminal: `git pull https://github.com/dealmeidafernando/carrier-desk.git main`
3. Click **Deploy**. The platform commits, pushes to the managed repo and builds.

The platform injects `NEXT_PUBLIC_TWIN_GATEWAY`, `NEXT_PUBLIC_ORG_ID` and `HR_PLATFORM_URL` at build time. The repo holds no secrets.
