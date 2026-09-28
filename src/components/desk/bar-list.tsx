/**
 * Horizontal bars for one series (counts). One neutral hue, values and labels in text ink,
 * a hover title per bar, and the numbers are always printed so nothing depends on color.
 */
export type BarItem = {
  key: string;
  label: string;
  value: number;
  /** Secondary text after the value, e.g. "42% of previous step". */
  note?: string;
};

export function BarList({ items, max }: { items: BarItem[]; max?: number }) {
  const top = Math.max(max ?? 0, ...items.map((i) => i.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const width = (item.value / top) * 100;
        return (
          <li
            key={item.key}
            className="flex flex-col gap-1"
            title={`${item.label}: ${item.value}${item.note ? ` (${item.note})` : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-medium">{item.value}</span>
                {item.note ? (
                  <span className="ml-2 text-xs text-muted-foreground">{item.note}</span>
                ) : null}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-chart-3"
                style={{ width: `${item.value > 0 ? Math.max(width, 2) : 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
