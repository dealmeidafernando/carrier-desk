import { getTwinRows } from "@/lib/twin";
import { toDate, usd } from "@/lib/desk/format";
import type { CallRow, EventRow } from "@/lib/desk/types";

/**
 * One call as it happens: the API writes the `calls` row and a `call_events` row at every tool
 * call, so polling Twin is enough to follow a call live.
 */

export type OfferedLoad = { loadId: string; lane: string; openingOffer: number };

export type LiveCall = {
  call: CallRow;
  events: EventRow[];
  /** Loads pitched on this call, from the API session. Only these fields leave the server. */
  offered: OfferedLoad[];
};

/** A call with no end after this long is treated as dropped, not live. */
const LIVE_WINDOW_MS = 20 * 60_000;

export function isLive(call: CallRow, now = Date.now()): boolean {
  return !call.ended_at && now - toDate(call.created_at).getTime() < LIVE_WINDOW_MS;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type SessionLoads = { offeredLoads?: Record<string, { lane?: string; openingOffer?: number }> };

/** The session also holds the contact on file, so pick the pitched loads and drop the rest. */
function offeredLoads(session: unknown): OfferedLoad[] {
  const parsed = (typeof session === "string" ? JSON.parse(session) : session) as SessionLoads;
  return Object.entries(parsed?.offeredLoads ?? {}).map(([loadId, load]) => ({
    loadId,
    lane: (load.lane ?? "").replace(" -> ", " → "),
    openingOffer: num(load.openingOffer) ?? 0,
  }));
}

/** The call to follow: the one asked for, or the most recent. */
export async function loadLiveCall(callId?: string): Promise<LiveCall | null> {
  const rows = await getTwinRows<(CallRow & { session: unknown })[]>("calls", {
    params: {
      select:
        "call_id,state,outcome,mc_number,carrier_name,load_id,offer_rate_initial,agreed_rate,max_buy,rounds,sentiment,summary,extracted,run_url,duration_s,created_at,ended_at,session",
      ...(callId ? { call_id: `eq.${callId}` } : {}),
      order: "created_at.desc",
      limit: "1",
    },
  });
  const row = rows[0];
  if (!row) return null;

  const { session, ...rest } = row;
  const call: CallRow = {
    ...rest,
    offer_rate_initial: num(rest.offer_rate_initial),
    agreed_rate: num(rest.agreed_rate),
    max_buy: num(rest.max_buy),
    rounds: num(rest.rounds),
    duration_s: num(rest.duration_s),
  };

  const events = await getTwinRows<EventRow[]>("call_events", {
    params: {
      select: "id,call_id,type,payload,created_at",
      call_id: `eq.${call.call_id}`,
      order: "created_at.asc",
    },
  });

  let offered: OfferedLoad[] = [];
  try {
    offered = offeredLoads(session);
  } catch {
    // A session we can't read only hides the lanes; the rest of the page still works.
  }
  return { call, events, offered };
}

// ---- progress ----------------------------------------------------------------------------

export type StepState = "done" | "current" | "failed" | "todo";
export type Step = { label: string; state: StepState; at: string | null };

/** Array.prototype.findLast, which the template's TS target (ES2017 lib) lacks. */
export function findLast<T>(items: T[], test: (item: T) => boolean): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i]!)) return items[i];
  return undefined;
}

const first = (events: EventRow[], test: (e: EventRow) => boolean) =>
  events.find(test)?.created_at ?? null;

/** The API's state machine, as ops reads it. A step is done once its event exists. */
export function progress(events: EventRow[], live: boolean): Step[] {
  const type = (t: string) => (e: EventRow) => e.type === t;
  const paused = first(events, type("agent_paused"));
  const ineligible = events.find((e) => e.type === "fmcsa_checked" && e.payload?.eligible !== true);
  const locked = events.find((e) => e.type === "otp_failed" && e.payload?.locked === true);
  const offered = first(
    events,
    (e) => e.type === "loads_searched" && Array.isArray(e.payload?.offered) && e.payload.offered.length > 0
  );
  const accepted = first(events, (e) => e.type === "offer_evaluated" && e.payload?.action === "accept");
  const declined = events.find((e) => e.type === "offer_evaluated" && e.payload?.action === "decline");
  const failedBooking = findLast(events, (e) => e.type === "booking_failed");
  const booked = first(events, type("booked"));

  const steps: Step[] = [
    {
      label: "Carrier checked (FMCSA)",
      at: first(events, (e) => e.type === "fmcsa_checked" && e.payload?.eligible === true),
      state: "todo",
    },
    { label: "Code sent", at: first(events, type("otp_sent")), state: "todo" },
    { label: "Identity verified", at: first(events, type("otp_verified")), state: "todo" },
    { label: "Load offered", at: offered, state: "todo" },
    { label: "Negotiating", at: first(events, type("offer_evaluated")), state: "todo" },
    { label: "Rate agreed", at: accepted, state: "todo" },
    { label: "Booked, handed to a rep", at: booked, state: "todo" },
  ];
  for (const step of steps) if (step.at) step.state = "done";

  // Where the call stopped: mark the first unfinished step as failed (call over) or current.
  const stoppedBy =
    paused ?? ineligible?.created_at ?? locked?.created_at ?? declined?.created_at ?? null;
  const next = steps.find((s) => s.state === "todo");
  if (next) {
    if (stoppedBy || (failedBooking && next === steps[6] && !live)) next.state = "failed";
    else if (live) next.state = "current";
  }
  return steps;
}

// ---- activity feed -----------------------------------------------------------------------

export type Tone = "good" | "bad" | "neutral";
export type Activity = { id: number; at: string; tool: string; text: string; tone: Tone };

type P = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const money = (v: unknown) => usd(num(v));

function place(city: unknown, state: unknown): string {
  const parts = [str(city), str(state)].filter(Boolean);
  return parts.length ? parts.join(", ") : "anywhere";
}

function describe(type: string, p: P): Omit<Activity, "id" | "at"> | null {
  switch (type) {
    case "session_started":
      return { tool: "call", text: "Call connected", tone: "neutral" };
    case "agent_paused":
      return {
        tool: "verify_carrier",
        text: `Agent paused by ops: MC ${str(p.mc)} gets a rep callback`,
        tone: "bad",
      };
    case "fmcsa_checked":
      return p.eligible === true
        ? { tool: "verify_carrier", text: `FMCSA: MC ${str(p.mc)} is authorized`, tone: "good" }
        : {
            tool: "verify_carrier",
            text: `FMCSA: MC ${str(p.mc)} not eligible (${str(p.reason).replace(/_/g, " ")})`,
            tone: "bad",
          };
    case "fmcsa_error":
      return { tool: "verify_carrier", text: "FMCSA lookup failed", tone: "bad" };
    case "otp_sent":
      return {
        tool: "send_otp",
        text: `${p.resend ? "New code" : "Code"} sent to ${str(p.destination)}`,
        tone: "neutral",
      };
    case "otp_verified":
      return { tool: "verify_otp", text: "Code correct: identity verified", tone: "good" };
    case "otp_failed":
      return {
        tool: "verify_otp",
        text: p.locked ? "Wrong code: locked out" : `Wrong code (attempt ${String(p.attempts)})`,
        tone: "bad",
      };
    case "loads_searched": {
      const q = (p.query ?? {}) as P;
      const offered = Array.isArray(p.offered) ? p.offered.length : 0;
      const equipment = str(q.equipment).replace(/_/g, " ").toLowerCase() || "any";
      const lane = `${place(q.originCity, q.originState)} → ${place(q.destinationCity, q.destinationState)}`;
      return {
        tool: "search_loads",
        text: `${lane}, ${equipment}: ${offered ? `${offered} load${offered > 1 ? "s" : ""} pitched` : "nothing to pitch"}`,
        tone: offered ? "good" : "neutral",
      };
    }
    case "offer_confirm_requested":
      return {
        tool: "evaluate_offer",
        text: `Reading back ${money(p.carrier_rate)} before deciding`,
        tone: "neutral",
      };
    case "offer_evaluated": {
      const ask = p.carrier_rate === null ? "" : ` at ${money(p.carrier_rate)}`;
      const answer =
        p.action === "accept"
          ? `agreed at ${money(p.rate)}`
          : p.action === "decline"
            ? "no deal"
            : `${String(p.action).replace(/_/g, " ")} ${money(p.rate)}`;
      return {
        tool: "evaluate_offer",
        text: `Carrier: ${String(p.intent)}${ask} → ${answer} (round ${String(p.round)})`,
        tone: p.action === "accept" ? "good" : p.action === "decline" ? "bad" : "neutral",
      };
    }
    case "booking_attempted":
      return {
        tool: "book_and_transfer",
        text: `Booking ${str(p.load_id)} at ${money(p.rate)}`,
        tone: "neutral",
      };
    case "tms_error":
      return { tool: "tms", text: `TMS ${str(p.command)}: ${str(p.kind)} reply`, tone: "bad" };
    case "booked":
      return {
        tool: "book_and_transfer",
        text: `Booked ${str(p.load_id)} at ${money(p.rate)}${p.booking_ref ? ` · ref ${str(p.booking_ref)}` : p.ref_unknown ? " · ref pending" : ""}`,
        tone: "good",
      };
    case "booking_failed":
      return {
        tool: "book_and_transfer",
        text: `Not booked: ${str(p.reason).replace(/_/g, " ")}`,
        tone: "bad",
      };
    case "handoff_queued":
      return { tool: "transfer", text: `Handed to ${str(p.rep)} (rep queue)`, tone: "good" };
    case "call_completed":
      return { tool: "call", text: `Call ended: ${str(p.outcome).replace(/_/g, " ")}`, tone: "neutral" };
    case "rep_decision":
      return { tool: "desk", text: `Rep ${str(p.decision)} (${str(p.by)})`, tone: "neutral" };
    default:
      return null;
  }
}

/** Newest first, like a log tail. */
export function activity(events: EventRow[]): Activity[] {
  return events
    .flatMap((e) => {
      const d = describe(e.type, e.payload ?? {});
      return d ? [{ id: e.id, at: e.created_at, ...d }] : [];
    })
    .reverse();
}

// ---- negotiation -------------------------------------------------------------------------

export type Round = { round: number; ask: number | null; answer: string; rate: number | null };

export function rounds(events: EventRow[]): Round[] {
  return events
    .filter((e) => e.type === "offer_evaluated")
    .map((e) => ({
      round: num(e.payload?.round) ?? 0,
      ask: num(e.payload?.carrier_rate),
      answer: String(e.payload?.action ?? "").replace(/_/g, " "),
      rate: num(e.payload?.rate),
    }));
}
