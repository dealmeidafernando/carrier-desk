import type { CallRow, EventRow, Outcome } from "@/lib/desk/types";

/**
 * Pure functions from Twin rows to the numbers on the desk. No I/O, so they are easy to check
 * against a SQL query in the Twin console.
 */

type EventsByCall = Map<string, EventRow[]>;

export function groupEvents(events: EventRow[]): EventsByCall {
  const byCall: EventsByCall = new Map();
  for (const event of events) {
    const list = byCall.get(event.call_id);
    if (list) list.push(event);
    else byCall.set(event.call_id, [event]);
  }
  return byCall;
}

function has(
  events: EventRow[] | undefined,
  type: string,
  test: (payload: Record<string, unknown>) => boolean = () => true
): boolean {
  return (events ?? []).some((e) => e.type === type && test(e.payload ?? {}));
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

// ---- funnel ------------------------------------------------------------------------------

export type FunnelStep = { key: string; label: string; count: number };

/** Each step counts calls that reached it; the agent can't skip a step (API state machine). */
export function funnel(calls: CallRow[], byCall: EventsByCall): FunnelStep[] {
  const reached = (test: (call: CallRow, events: EventRow[] | undefined) => boolean) =>
    calls.filter((call) => test(call, byCall.get(call.call_id))).length;

  return [
    { key: "started", label: "Calls", count: calls.length },
    {
      key: "eligible",
      label: "FMCSA eligible",
      count: reached((_, ev) => has(ev, "fmcsa_checked", (p) => p.eligible === true)),
    },
    {
      key: "verified",
      label: "Identity verified (OTP)",
      count: reached((_, ev) => has(ev, "otp_verified")),
    },
    {
      key: "offered",
      label: "Load offered",
      count: reached((_, ev) =>
        has(ev, "loads_searched", (p) => Array.isArray(p.offered) && p.offered.length > 0)
      ),
    },
    {
      key: "negotiated",
      label: "Negotiated",
      count: reached((_, ev) => has(ev, "offer_evaluated")),
    },
    { key: "agreed", label: "Rate agreed", count: reached((c) => c.agreed_rate !== null) },
    { key: "booked", label: "Booked", count: reached((c) => c.outcome === "booked") },
  ];
}

// ---- KPIs --------------------------------------------------------------------------------

export type Kpis = {
  calls: number;
  booked: number;
  /** booked / identity-verified calls: the part of the funnel the agent controls. */
  conversion: number | null;
  avgRounds: number | null;
  /** Mean (MAX_BUY - agreed) / MAX_BUY over agreed calls: money kept under the ceiling. */
  marginKept: number | null;
  /** Agreed above MAX_BUY. The API makes this impossible; the tile proves it on real data. */
  ceilingBreaches: number;
  /** Mean agreed - opening offer over agreed calls: what negotiation cost vs. the posted rate. */
  avgLift: number | null;
  avgDurationS: number | null;
  /** Share of calls where the post-call AI classifier agrees with the API's outcome. */
  classifierAgreement: number | null;
  negativeSentiment: number | null;
};

export function kpis(calls: CallRow[], byCall: EventsByCall): Kpis {
  const verified = calls.filter((c) => has(byCall.get(c.call_id), "otp_verified")).length;
  const booked = calls.filter((c) => c.outcome === "booked").length;
  const agreed = calls.filter((c) => c.agreed_rate !== null);
  const withCeiling = agreed.filter((c) => c.max_buy !== null && c.max_buy > 0);
  const negotiated = calls.filter((c) => has(byCall.get(c.call_id), "offer_evaluated"));

  const verdicts = calls.flatMap((c) =>
    (byCall.get(c.call_id) ?? [])
      .filter((e) => e.type === "call_completed" && typeof e.payload?.classifier_agrees === "boolean")
      .map((e) => e.payload?.classifier_agrees === true)
  );
  const sentiments = calls.filter((c) => c.sentiment);

  return {
    calls: calls.length,
    booked,
    conversion: verified ? booked / verified : null,
    avgRounds: mean(negotiated.map((c) => c.rounds ?? 0)),
    marginKept: mean(withCeiling.map((c) => (c.max_buy! - c.agreed_rate!) / c.max_buy!)),
    ceilingBreaches: withCeiling.filter((c) => c.agreed_rate! > c.max_buy!).length,
    avgLift: mean(
      agreed
        .filter((c) => c.offer_rate_initial !== null)
        .map((c) => c.agreed_rate! - c.offer_rate_initial!)
    ),
    avgDurationS: mean(calls.flatMap((c) => (c.duration_s === null ? [] : [c.duration_s]))),
    classifierAgreement: verdicts.length
      ? verdicts.filter(Boolean).length / verdicts.length
      : null,
    negativeSentiment: sentiments.length
      ? sentiments.filter((c) => c.sentiment === "negative").length / sentiments.length
      : null,
  };
}

// ---- outcomes ----------------------------------------------------------------------------

export const OUTCOME_ORDER: Outcome[] = [
  "booked",
  "negotiation_failed",
  "no_match",
  "otp_failed",
  "ineligible",
  "booking_failed",
  "abandoned",
];

export function outcomeCounts(calls: CallRow[]): { outcome: Outcome; count: number }[] {
  return OUTCOME_ORDER.map((outcome) => ({
    outcome,
    count: calls.filter((c) => (c.outcome ?? "abandoned") === outcome).length,
  })).filter((row) => row.count > 0);
}

// ---- lane demand -------------------------------------------------------------------------

export type LaneDemand = { lane: string; equipment: string; searches: number };

type SearchQuery = {
  originCity?: string;
  originState?: string;
  destinationCity?: string;
  destinationState?: string;
  equipment?: string;
};

function place(city?: string, state?: string): string {
  if (city && state) return `${city}, ${state}`;
  return city || state || "Anywhere";
}

/** Searches that found nothing to offer: freight carriers want that the board doesn't have. */
export function unmetLaneDemand(events: EventRow[], limit = 8): LaneDemand[] {
  const counts = new Map<string, LaneDemand>();
  for (const event of events) {
    if (event.type !== "loads_searched") continue;
    const offered = event.payload?.offered;
    if (Array.isArray(offered) && offered.length > 0) continue;
    const q = (event.payload?.query ?? {}) as SearchQuery;
    const lane = `${place(q.originCity, q.originState)} → ${place(q.destinationCity, q.destinationState)}`;
    const equipment = (q.equipment ?? "ANY").replace(/_/g, " ").toLowerCase();
    const key = `${lane}|${equipment}`;
    const row = counts.get(key) ?? { lane, equipment, searches: 0 };
    row.searches += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.searches - a.searches).slice(0, limit);
}

// ---- integration health ------------------------------------------------------------------

export type Health = { tmsErrors: number; fmcsaErrors: number; pausedCalls: number };

export function health(events: EventRow[]): Health {
  const count = (type: string) => events.filter((e) => e.type === type).length;
  return {
    tmsErrors: count("tms_error"),
    fmcsaErrors: count("fmcsa_error"),
    pausedCalls: count("agent_paused"),
  };
}

/** The MC a caller gave, even when the API stored none on the call (ineligible carriers). */
export function mcFor(call: CallRow, byCall: EventsByCall): string | null {
  if (call.mc_number) return call.mc_number;
  const checked = byCall.get(call.call_id)?.find((e) => e.type === "fmcsa_checked");
  const mc = checked?.payload?.mc;
  return typeof mc === "string" ? mc : null;
}

export function classifierDisagrees(call: CallRow): boolean {
  const classified = call.extracted?.classified_outcome;
  return Boolean(classified && call.outcome && classified !== call.outcome);
}
