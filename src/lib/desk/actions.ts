"use server";

import { revalidatePath } from "next/cache";

import { requireAppUser } from "@/lib/auth";
import { fetchTwin } from "@/lib/twin";
import type { HandoffRow, HandoffStatus } from "@/lib/desk/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const REP_DECISIONS: HandoffStatus[] = ["confirmed", "callback", "released"];

async function twinWrite(path: string, method: string, body: unknown, prefer: string) {
  return fetchTwin(path, {
    method,
    headers: { "Content-Type": "application/json", Prefer: prefer },
    body: JSON.stringify(body),
  });
}

/** Audit trail in the same table the voice agent's API writes to. */
async function audit(callId: string, type: string, payload: Record<string, unknown>) {
  await twinWrite("/call_events", "POST", { call_id: callId, type, payload }, "return=minimal");
}

/**
 * Senior-rep decision on a booked load. Only open handoffs (pending / callback) can change,
 * so two reps clicking at once can't overwrite each other's decision.
 *
 * "released" does not reopen the load on the TMS: the TMS protocol has no cancel command
 * (only LOAD_QUERY, LOAD_GET, LOAD_BOOK), so it flags the booking for manual cancellation.
 */
export async function decideHandoff(id: number, status: HandoffStatus): Promise<ActionResult> {
  const { user } = await requireAppUser();
  if (!Number.isInteger(id) || !REP_DECISIONS.includes(status)) {
    return { ok: false, error: "Invalid request." };
  }

  const response = await twinWrite(
    `/handoff_queue?id=eq.${id}&status=in.(pending,callback)`,
    "PATCH",
    { status, assigned_rep: user.email, updated_at: new Date().toISOString() },
    "return=representation"
  );
  if (!response.ok) return { ok: false, error: `Twin rejected the update (${response.status}).` };

  const [row] = (await response.json()) as HandoffRow[];
  if (!row) return { ok: false, error: "Already handled by someone else. Refresh the queue." };

  await audit(row.call_id, "rep_decision", {
    handoff_id: id,
    decision: status,
    load_id: row.load_id,
    by: user.email,
  });
  revalidatePath("/queue");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Kill switch read by the API at verify_carrier: while paused, the agent tells callers a rep
 * will call them back and never sends a code or quotes a load.
 */
export async function setAgentPaused(paused: boolean): Promise<ActionResult> {
  const { user } = await requireAppUser();
  const now = new Date().toISOString();

  const response = await twinWrite(
    "/agent_settings",
    "POST",
    { key: "kill_switch", value: { paused, by: user.email, at: now }, updated_at: now },
    "resolution=merge-duplicates,return=minimal"
  );
  if (!response.ok) return { ok: false, error: `Twin rejected the update (${response.status}).` };

  revalidatePath("/");
  return { ok: true };
}
