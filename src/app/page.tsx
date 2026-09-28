import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { BarList } from "@/components/desk/bar-list";
import { KillSwitch } from "@/components/desk/kill-switch";
import { RangeFilter } from "@/components/desk/range-filter";
import { StatTile } from "@/components/desk/stat-tile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAppUser } from "@/lib/auth";
import {
  loadCalls,
  loadEvents,
  loadHandoffs,
  loadKillSwitch,
  parseRange,
} from "@/lib/desk/data";
import { dateTime, duration, outcomeLabel, pct, signedUsd } from "@/lib/desk/format";
import {
  funnel,
  groupEvents,
  health,
  kpis,
  outcomeCounts,
  unmetLaneDemand,
} from "@/lib/desk/metrics";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAppUser();
  const range = parseRange((await searchParams).range);

  let data;
  try {
    const [calls, events, handoffs, killSwitch] = await Promise.all([
      loadCalls(range),
      loadEvents(range),
      loadHandoffs(),
      loadKillSwitch(),
    ]);
    data = { calls, events, handoffs, killSwitch };
  } catch (error) {
    return (
      <AppShell title="Overview">
        <Alert variant="destructive">
          <AlertTitle>Twin unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Could not load call data."}
          </AlertDescription>
        </Alert>
      </AppShell>
    );
  }

  const { calls, events, handoffs, killSwitch } = data;
  const byCall = groupEvents(events);
  const k = kpis(calls, byCall);
  const steps = funnel(calls, byCall);
  const outcomes = outcomeCounts(calls);
  const lanes = unmetLaneDemand(events);
  const h = health(events);
  const openHandoffs = handoffs.filter((x) => x.status === "pending" || x.status === "callback");

  return (
    <AppShell title="Overview">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Inbound carrier desk</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            What Riley, the voice agent, did with every carrier call: who got verified, what we
            offered, what we agreed and what is waiting for a senior rep.
          </p>
        </div>
        <RangeFilter current={range} basePath="/" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KillSwitch
          state={killSwitch}
          since={killSwitch.at ? dateTime(killSwitch.at) : null}
        />
        <Card size="sm" className="lg:col-span-2">
          <CardHeader>
            <CardDescription>Senior-rep queue</CardDescription>
            <CardTitle className="text-base">
              {openHandoffs.length === 0
                ? "Nothing waiting"
                : `${openHandoffs.length} booking${openHandoffs.length === 1 ? "" : "s"} waiting for a rep`}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Loads the agent booked on the TMS. A rep confirms the rate con or releases the load.{" "}
              <Link href="/queue" className="underline underline-offset-4">
                Open the queue
              </Link>
            </p>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Calls" value={String(k.calls)} hint={`${k.booked} booked`} />
        <StatTile
          label="Conversion"
          value={pct(k.conversion)}
          hint="Booked ÷ identity-verified calls"
        />
        <StatTile
          label="Margin kept under ceiling"
          value={pct(k.marginKept, 1)}
          hint="Avg (MAX_BUY − agreed) ÷ MAX_BUY on agreed rates"
        />
        <StatTile
          label="Ceiling breaches"
          value={String(k.ceilingBreaches)}
          hint="Agreed above MAX_BUY. Must stay 0"
          status={k.ceilingBreaches === 0 ? "good" : "critical"}
        />
        <StatTile
          label="Avg rounds"
          value={k.avgRounds === null ? "—" : k.avgRounds.toFixed(1)}
          hint="Counter rounds per negotiated call (max 3)"
        />
        <StatTile
          label="Paid over opening offer"
          value={signedUsd(k.avgLift === null ? null : Math.round(k.avgLift))}
          hint="Avg agreed − posted rate"
        />
        <StatTile
          label="Avg call length"
          value={duration(k.avgDurationS)}
          hint={`${pct(k.negativeSentiment)} negative sentiment`}
        />
        <StatTile
          label="Outcome audit"
          value={pct(k.classifierAgreement)}
          hint="Post-call AI classifier agrees with the API"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funnel</CardTitle>
            <CardDescription>Calls that reached each step, with the share of the step before.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={steps.map((step, i) => ({
                key: step.key,
                label: step.label,
                value: step.count,
                note:
                  i === 0 || steps[i - 1].count === 0
                    ? undefined
                    : `${pct(step.count / steps[i - 1].count)}`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How calls ended</CardTitle>
            <CardDescription>
              Outcome from the API&apos;s state machine.{" "}
              <Link href="/calls" className="underline underline-offset-4">
                See every call
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={outcomes.map((o) => ({
                key: o.outcome,
                label: outcomeLabel(o.outcome),
                value: o.count,
                note: pct(o.count / Math.max(k.calls, 1)),
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Unmet lane demand</CardTitle>
            <CardDescription>
              Searches with nothing to offer. Freight carriers asked for that the board didn&apos;t
              have: a sales signal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lanes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No empty searches in this range.</p>
            ) : (
              <BarList
                items={lanes.map((lane) => ({
                  key: `${lane.lane}-${lane.equipment}`,
                  label: `${lane.lane} · ${lane.equipment}`,
                  value: lane.searches,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration health</CardTitle>
            <CardDescription>
              Failures the API absorbed or surfaced. The TMS client retries silently before a
              call ever sees an error.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <HealthFigure label="TMS errors" value={h.tmsErrors} />
            <HealthFigure label="FMCSA errors" value={h.fmcsaErrors} />
            <HealthFigure label="Calls while paused" value={h.pausedCalls} />
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function HealthFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
