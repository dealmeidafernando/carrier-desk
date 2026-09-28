import { AppShell } from "@/components/app-shell";
import { HandoffActions } from "@/components/desk/handoff-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAppUser } from "@/lib/auth";
import { loadHandoffs } from "@/lib/desk/data";
import { dateTime, usd } from "@/lib/desk/format";
import type { HandoffRow, HandoffStatus } from "@/lib/desk/types";

const STATUS_LABEL: Record<HandoffStatus, string> = {
  pending: "Waiting",
  callback: "Call back",
  confirmed: "Confirmed",
  released: "Released",
};

const OPEN: HandoffStatus[] = ["pending", "callback"];

export default async function QueuePage() {
  await requireAppUser();

  let handoffs: HandoffRow[];
  try {
    handoffs = await loadHandoffs();
  } catch (error) {
    return (
      <AppShell title="Rep queue">
        <Alert variant="destructive">
          <AlertTitle>Twin unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Could not load the queue."}
          </AlertDescription>
        </Alert>
      </AppShell>
    );
  }

  const open = handoffs.filter((h) => OPEN.includes(h.status));
  const done = handoffs.filter((h) => !OPEN.includes(h.status));

  return (
    <AppShell title="Rep queue">
      <section className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Senior-rep queue</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          When a carrier accepts, the agent books the load on the TMS and hands the call to a senior
          rep to finalize the rate confirmation. Confirm it, schedule a call back, or release it.
          The TMS has no cancel command, so a released load must also be cancelled there.
        </p>
      </section>

      <HandoffTable title="Open" rows={open} empty="Nothing waiting for a rep." />
      {done.length > 0 ? <HandoffTable title="Handled" rows={done} empty="" /> : null}
    </AppShell>
  );
}

function HandoffTable({ title, rows, empty }: { title: string; rows: HandoffRow[]; empty: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        {title} <span className="text-muted-foreground">({rows.length})</span>
      </h3>
      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booked</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Load</TableHead>
              <TableHead className="text-right">Agreed rate</TableHead>
              <TableHead>TMS ref</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {dateTime(row.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.carrier_name ?? "Unknown carrier"}</div>
                    <div className="text-xs text-muted-foreground">MC {row.mc_number}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.load_id}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {usd(row.agreed_rate)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.booking_ref ?? "pending"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-0.5">
                      <Badge variant={row.status === "released" ? "destructive" : "secondary"}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </Badge>
                      {row.assigned_rep && !OPEN.includes(row.status) ? (
                        <span className="text-xs text-muted-foreground">by {row.assigned_rep}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <HandoffActions id={row.id} status={row.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
