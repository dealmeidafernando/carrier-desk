import { getTwinRows } from "@/lib/twin";
import type {
  CallRow,
  EventRow,
  HandoffRow,
  KillSwitch,
} from "@/lib/desk/types";

/** Enough history for a demo org; paging comes before this is used at scale. */
const MAX_ROWS = "1000";

export type Range = "24h" | "7d" | "all";

export function parseRange(value: string | string[] | undefined): Range {
  return value === "24h" || value === "7d" ? value : "all";
}

function sinceFilter(range: Range): Record<string, string> {
  if (range === "all") return {};
  const hours = range === "24h" ? 24 : 24 * 7;
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  return { created_at: `gte.${since}` };
}

/** bigint columns can arrive as strings depending on the gateway; normalize once here. */
function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function loadCalls(range: Range): Promise<CallRow[]> {
  const rows = await getTwinRows<CallRow[]>("calls", {
    params: {
      select:
        "call_id,state,outcome,mc_number,carrier_name,load_id,offer_rate_initial,agreed_rate,max_buy,rounds,sentiment,summary,extracted,run_url,duration_s,created_at,ended_at",
      order: "created_at.desc",
      limit: MAX_ROWS,
      ...sinceFilter(range),
    },
  });
  return rows.map((row) => ({
    ...row,
    offer_rate_initial: num(row.offer_rate_initial),
    agreed_rate: num(row.agreed_rate),
    max_buy: num(row.max_buy),
    rounds: num(row.rounds),
    duration_s: num(row.duration_s),
  }));
}

export async function loadEvents(range: Range): Promise<EventRow[]> {
  return getTwinRows<EventRow[]>("call_events", {
    params: {
      select: "id,call_id,type,payload,created_at",
      order: "created_at.asc",
      limit: "5000",
      ...sinceFilter(range),
    },
  });
}

export async function loadHandoffs(): Promise<HandoffRow[]> {
  const rows = await getTwinRows<HandoffRow[]>("handoff_queue", {
    params: { order: "created_at.desc", limit: "200" },
  });
  return rows.map((row) => ({ ...row, agreed_rate: num(row.agreed_rate) ?? 0 }));
}

export async function loadKillSwitch(): Promise<KillSwitch> {
  const rows = await getTwinRows<{ value: unknown }[]>("agent_settings", {
    params: { key: "eq.kill_switch", select: "value" },
  });
  const value = rows[0]?.value;
  if (value && typeof value === "object") {
    const v = value as KillSwitch;
    return { paused: v.paused === true, by: v.by, at: v.at };
  }
  return { paused: value === true };
}
