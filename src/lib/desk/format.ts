import type { Outcome } from "@/lib/desk/types";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function usd(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : usdFormatter.format(value);
}

export function signedUsd(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : "−"}${usdFormatter.format(Math.abs(value))}`;
}

export function pct(value: number | null, digits = 0): string {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

export function duration(seconds: number | null): string {
  if (seconds === null) return "—";
  const s = Math.round(seconds);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/** Twin `timestamp without time zone` columns hold UTC but arrive without an offset. */
export function toDate(value: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

export function dateTime(value: string): string {
  return toDate(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  });
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  booked: "Booked",
  negotiation_failed: "No agreement",
  no_match: "No matching load",
  otp_failed: "Not verified",
  ineligible: "Ineligible",
  booking_failed: "Booking failed",
  abandoned: "Abandoned",
};

export function outcomeLabel(value: string | null | undefined): string {
  return OUTCOME_LABEL[(value ?? "abandoned") as Outcome] ?? value ?? "—";
}
