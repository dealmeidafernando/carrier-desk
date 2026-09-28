import Link from "next/link";
import { IconAlertTriangle, IconExternalLink, IconPlayerPause } from "@tabler/icons-react";

import { AppShell } from "@/components/app-shell";
import { OutcomeBadge } from "@/components/desk/outcome-badge";
import { RangeFilter } from "@/components/desk/range-filter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAppUser } from "@/lib/auth";
import { loadCalls, loadEvents, parseRange } from "@/lib/desk/data";
import { dateTime, duration, outcomeLabel, usd } from "@/lib/desk/format";
import {
  classifierDisagrees,
  groupEvents,
  mcFor,
  OUTCOME_ORDER,
  wasPaused,
} from "@/lib/desk/metrics";
import { cn } from "@/lib/utils";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; outcome?: string }>;
}) {
  await requireAppUser();
  const params = await searchParams;
  const range = parseRange(params.range);
  const outcomeFilter = OUTCOME_ORDER.find((o) => o === params.outcome);

  let calls, events;
  try {
    [calls, events] = await Promise.all([loadCalls(range), loadEvents(range)]);
  } catch (error) {
    return (
      <AppShell title="Calls">
        <Alert variant="destructive">
          <AlertTitle>Twin unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Could not load calls."}
          </AlertDescription>
        </Alert>
      </AppShell>
    );
  }

  const byCall = groupEvents(events);
  const rows = outcomeFilter
    ? calls.filter((c) => (c.outcome ?? "abandoned") === outcomeFilter)
    : calls;
  const query = (outcome?: string) => {
    const q = new URLSearchParams();
    if (range !== "all") q.set("range", range);
    if (outcome) q.set("outcome", outcome);
    return q.size ? `/calls?${q}` : "/calls";
  };

  return (
    <AppShell title="Calls">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Every call, audited</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            One row per call, straight from the agent&apos;s API. Open the run for the full
            recording and transcript.
          </p>
        </div>
        <RangeFilter current={range} basePath="/calls" />
      </section>

      <nav aria-label="Outcome" className="flex flex-wrap gap-1.5 text-sm">
        {[undefined, ...OUTCOME_ORDER].map((outcome) => (
          <Link
            key={outcome ?? "all"}
            href={query(outcome)}
            aria-current={outcomeFilter === outcome ? "page" : undefined}
            className={cn(
              "rounded-2xl border px-3 py-1 text-muted-foreground hover:text-foreground",
              outcomeFilter === outcome && "bg-muted font-medium text-foreground"
            )}
          >
            {outcome ? outcomeLabel(outcome) : "All outcomes"}
          </Link>
        ))}
      </nav>

      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Load</TableHead>
              <TableHead className="text-right">Offer → agreed</TableHead>
              <TableHead className="text-right">Rounds</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead className="text-right">Length</TableHead>
              <TableHead className="text-right">Run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No calls in this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((call) => (
                <TableRow key={call.call_id} className="align-top">
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {dateTime(call.created_at)}
                  </TableCell>
                  <TableCell className="max-w-72">
                    <div className="font-medium">{call.carrier_name ?? "Unknown carrier"}</div>
                    <div className="text-xs text-muted-foreground">
                      MC {mcFor(call, byCall) ?? "—"}
                    </div>
                    {call.summary ? (
                      <p className="mt-1 line-clamp-2 whitespace-normal text-xs text-muted-foreground">
                        {call.summary}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <OutcomeBadge outcome={call.outcome} />
                      {wasPaused(call, byCall) ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconPlayerPause className="size-3" aria-hidden />
                          Agent paused · rep callback
                        </span>
                      ) : null}
                      {classifierDisagrees(call) ? (
                        <span
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                          title="The post-call AI classifier read this call differently. Worth a listen."
                        >
                          <IconAlertTriangle className="size-3" aria-hidden />
                          AI says: {outcomeLabel(call.extracted?.classified_outcome)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{call.load_id ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {call.offer_rate_initial === null
                      ? "—"
                      : `${usd(call.offer_rate_initial)} → ${usd(call.agreed_rate)}`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{call.rounds ?? 0}</TableCell>
                  <TableCell className="capitalize">{call.sentiment ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {duration(call.duration_s)}
                  </TableCell>
                  <TableCell className="text-right">
                    {call.run_url ? (
                      <a
                        href={call.run_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline underline-offset-4"
                      >
                        Open <IconExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
