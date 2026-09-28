import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Range } from "@/lib/desk/data";

const RANGES: { value: Range; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "all", label: "All time" },
];

export function RangeFilter({ current, basePath }: { current: Range; basePath: string }) {
  return (
    <nav aria-label="Time range" className="inline-flex rounded-2xl border p-0.5 text-sm">
      {RANGES.map((range) => (
        <Link
          key={range.value}
          href={range.value === "all" ? basePath : `${basePath}?range=${range.value}`}
          aria-current={current === range.value ? "page" : undefined}
          className={cn(
            "rounded-2xl px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
            current === range.value && "bg-muted font-medium text-foreground"
          )}
        >
          {range.label}
        </Link>
      ))}
    </nav>
  );
}
