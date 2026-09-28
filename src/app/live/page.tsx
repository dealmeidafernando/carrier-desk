import Link from "next/link";
import { IconCheck, IconExternalLink, IconX } from "@tabler/icons-react";

import { AppShell } from "@/components/app-shell";
import { CallClock, LiveRefresh } from "@/components/desk/live-refresh";
import { OutcomeBadge } from "@/components/desk/outcome-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAppUser } from "@/lib/auth";
import { toDate, usd } from "@/lib/desk/format";
import {
  activity,
  findLast,
  isLive,
  loadLiveCall,
  progress,
  rounds,
  type LiveCall,
  type StepState,
  type Tone,
} from "@/lib/desk/live";
import { mcFor, groupEvents } from "@/lib/desk/metrics";
import { cn } from "@/lib/utils";

const CALL_ID = /^[0-9a-f-]{36}$/i;

function clock(value: string): string {
  return toDate(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Chicago",
  });
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ call?: string }>;
}) {
  await requireAppUser();
  const requested = (await searchParams).call;
  const pinned = requested && CALL_ID.test(requested) ? requested : undefined;

  let data: LiveCall | null;
  try {
    data = await loadLiveCall(pinned);
  } catch (error) {
    return (
      <AppShell title="Live call">
        <LiveRefresh active />
        <Alert variant="destructive">
          <AlertTitle>Twin unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Could not load the call."}
          </AlertDescription>
        </Alert>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Live call">
        <LiveRefresh active={!pinned} />
        <p className="text-sm text-muted-foreground">
          {pinned ? "No call with that id." : "Waiting for the first call…"}
        </p>
      </AppShell>
    );
  }

  const { call, events, offered } = data;
  const live = isLive(call);
  const steps = progress(events, live);
  const feed = activity(events);
  const ladder = rounds(events);
  const mc = mcFor(call, groupEvents(events));
  const lastAsk = findLast(ladder, (r) => r.ask !== null)?.ask ?? null;
  const lastRate = ladder.at(-1)?.rate ?? null;
  // The load under negotiation; the API clears it from the row if the load gets covered.
  const lastNegotiated = findLast(events, (e) => e.type === "offer_evaluated")?.payload?.load_id;
  const focusLoad = call.load_id ?? (typeof lastNegotiated === "string" ? lastNegotiated : null);

  return (
    <AppShell title="Live call">
      {/* Following the latest call keeps polling so the next call appears on its own. */}
      <LiveRefresh active={live || !pinned} />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {live ? (
            <span className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <span aria-hidden className="size-2 animate-pulse rounded-full bg-destructive" />
              LIVE
            </span>
          ) : (
            <OutcomeBadge outcome={call.outcome} />
          )}
          <CallClock
            startedAt={toDate(call.created_at).toISOString()}
            endedSeconds={live ? null : (call.duration_s ?? null)}
          />
          <span className="text-sm">
            <span className="font-medium">{call.carrier_name ?? "Carrier not identified yet"}</span>
            {mc ? <span className="text-muted-foreground"> · MC {mc}</span> : null}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {pinned ? (
            <Link href="/live" className="underline underline-offset-4">
              Follow the latest call
            </Link>
          ) : (
            <span className="text-muted-foreground">Following the latest call</span>
          )}
          {call.run_url ? (
            <a
              href={call.run_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-4"
            >
              Run and transcript <IconExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Call progress</CardTitle>
            <CardDescription>The API only moves forward one step at a time.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col">
              {steps.map((step, i) => (
                <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < steps.length - 1 ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-5 left-[9px] h-[calc(100%-1rem)] w-px",
                        step.state === "done" ? "bg-success" : "bg-border"
                      )}
                    />
                  ) : null}
                  <StepDot state={step.state} />
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-sm",
                        step.state === "todo" && "text-muted-foreground",
                        step.state === "current" && "font-medium"
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {step.at
                        ? clock(step.at)
                        : step.state === "current"
                          ? "in progress…"
                          : step.state === "failed"
                            ? "stopped here"
                            : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card size="sm" className="min-h-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              API activity
              {live ? (
                <span className="text-xs font-normal text-muted-foreground">· updates every 2s</span>
              ) : null}
            </CardTitle>
            <CardDescription>Every tool call the agent made, as the API recorded it.</CardDescription>
          </CardHeader>
          <CardContent>
            {feed.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Waiting for the first tool call…
              </p>
            ) : (
              <ol className="flex flex-col divide-y" aria-live="polite">
                {feed.map((item) => (
                  <li key={item.id} className="grid grid-cols-[76px_1fr] gap-3 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {clock(item.at)}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <ToneDot tone={item.tone} />
                        {item.tool}
                      </span>
                      <span className="text-sm">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Deal</CardTitle>
              <CardDescription>What the carrier sees, plus the ceiling they never hear.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Load" value={call.load_id ?? "—"} mono />
                <Field label="Rounds" value={`${call.rounds ?? 0} of 3`} />
                <Field label="Our opening" value={usd(call.offer_rate_initial)} />
                <Field label="Carrier asked" value={usd(lastAsk)} />
                <Field label="Our last number" value={usd(lastRate)} />
                <Field label="Agreed" value={usd(call.agreed_rate)} strong />
                <Field label="Ceiling (MAX_BUY)" value={usd(call.max_buy)} muted />
                <Field
                  label="Kept under ceiling"
                  value={
                    call.max_buy && call.agreed_rate !== null
                      ? usd(call.max_buy - call.agreed_rate)
                      : "—"
                  }
                  muted
                />
              </dl>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Loads pitched</CardTitle>
            </CardHeader>
            <CardContent>
              {offered.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {offered.map((load) => (
                    <li
                      key={load.loadId}
                      className={cn(
                        "flex flex-col rounded-xl border px-3 py-2",
                        load.loadId === focusLoad && "border-foreground"
                      )}
                    >
                      <span className="flex justify-between gap-2">
                        <span className="font-mono text-xs">{load.loadId}</span>
                        <span className="tabular-nums">{usd(load.openingOffer)}</span>
                      </span>
                      <span className="text-muted-foreground">{load.lane}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {ladder.length > 0 ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Negotiation</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-1.5 text-sm">
                  {ladder.map((r, i) => (
                    <li key={i} className="grid grid-cols-[56px_1fr_auto] gap-2 tabular-nums">
                      <span className="text-muted-foreground">Round {r.round}</span>
                      <span>{r.ask === null ? "—" : `asks ${usd(r.ask)}`}</span>
                      <span className="capitalize">
                        {r.answer}
                        {r.rate !== null && r.answer !== "accept" ? ` ${usd(r.rate)}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {call.summary ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">After the call</CardTitle>
            <CardDescription>Written by the post-call AI extraction.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{call.summary}</CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}

function Field({
  label,
  value,
  mono,
  strong,
  muted,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          mono && "font-mono text-xs",
          strong && "font-semibold",
          muted && "text-muted-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StepDot({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <IconCheck className="size-3" aria-hidden />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-white">
        <IconX className="size-3" aria-hidden />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 size-5 shrink-0 rounded-full border-2 bg-background",
        state === "current" ? "animate-pulse border-foreground" : "border-border"
      )}
    />
  );
}

function ToneDot({ tone }: { tone: Tone }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full",
        tone === "good" && "bg-success",
        tone === "bad" && "bg-destructive",
        tone === "neutral" && "bg-muted-foreground"
      )}
    />
  );
}
