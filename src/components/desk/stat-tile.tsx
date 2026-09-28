import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  status,
}: {
  label: string;
  value: string;
  hint: string;
  /** Only for guard-rail tiles: green when the invariant holds, red when it's broken. */
  status?: "good" | "critical";
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          {status === "good" ? (
            <IconCircleCheck className="size-3.5 text-success" aria-hidden />
          ) : status === "critical" ? (
            <IconAlertTriangle className="size-3.5 text-destructive" aria-hidden />
          ) : null}
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "text-2xl tabular-nums",
            status === "critical" && "text-destructive"
          )}
        >
          {value}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardHeader>
    </Card>
  );
}
