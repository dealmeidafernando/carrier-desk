/**
 * Row shapes of the Twin tables written by the carrier-sales API
 * (carrier-sales-api/src/infrastructure/store/twin-store.ts).
 */

export type Outcome =
  | "booked"
  | "negotiation_failed"
  | "no_match"
  | "ineligible"
  | "otp_failed"
  | "booking_failed"
  | "abandoned";

export type Extracted = {
  equipment?: string;
  objections?: string;
  lane_preferences?: string;
  callback_requested?: string;
  classified_outcome?: string | null;
};

export type CallRow = {
  call_id: string;
  state: string;
  outcome: Outcome | null;
  mc_number: string | null;
  carrier_name: string | null;
  load_id: string | null;
  offer_rate_initial: number | null;
  agreed_rate: number | null;
  /** MAX_BUY from the TMS. Shown to ops only; the voice agent never sees it. */
  max_buy: number | null;
  rounds: number | null;
  sentiment: string | null;
  summary: string | null;
  extracted: Extracted | null;
  run_url: string | null;
  duration_s: number | null;
  created_at: string;
  ended_at: string | null;
};

export type EventRow = {
  id: number;
  call_id: string;
  type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type HandoffStatus = "pending" | "confirmed" | "callback" | "released";

export type HandoffRow = {
  id: number;
  call_id: string;
  load_id: string;
  mc_number: string;
  carrier_name: string | null;
  agreed_rate: number;
  booking_ref: string | null;
  status: HandoffStatus;
  assigned_rep: string | null;
  created_at: string;
  updated_at: string;
};

export type KillSwitch = {
  paused: boolean;
  by?: string;
  at?: string;
};
