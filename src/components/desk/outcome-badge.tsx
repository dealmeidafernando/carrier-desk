import { Badge } from "@/components/ui/badge";
import { outcomeLabel } from "@/lib/desk/format";

/** Status is carried by the label; color only reinforces it (booked = good, failures = muted). */
export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (outcome === "booked") {
    return <Badge className="bg-success text-white">{outcomeLabel(outcome)}</Badge>;
  }
  if (outcome === "booking_failed") {
    return <Badge variant="destructive">{outcomeLabel(outcome)}</Badge>;
  }
  return <Badge variant="secondary">{outcomeLabel(outcome)}</Badge>;
}
