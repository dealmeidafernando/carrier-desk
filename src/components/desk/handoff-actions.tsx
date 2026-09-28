"use client";

import { useTransition } from "react";
import { IconCheck, IconPhone, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { decideHandoff } from "@/lib/desk/actions";
import type { HandoffStatus } from "@/lib/desk/types";

const DONE: Record<HandoffStatus, string> = {
  pending: "",
  confirmed: "Booking confirmed",
  callback: "Marked for a callback",
  released: "Released. Cancel the booking in the TMS.",
};

export function HandoffActions({ id, status }: { id: number; status: HandoffStatus }) {
  const [pending, startTransition] = useTransition();

  function decide(next: HandoffStatus) {
    if (
      next === "released" &&
      !window.confirm(
        "Release this load? The TMS has no cancel command, so the booking must be cancelled there manually."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await decideHandoff(id, next);
      if (result.ok) toast.success(DONE[next]);
      else toast.error(result.error);
    });
  }

  if (status === "confirmed" || status === "released") return null;

  return (
    <div className="flex justify-end gap-1.5">
      <Button size="xs" onClick={() => decide("confirmed")} disabled={pending}>
        <IconCheck data-icon="inline-start" />
        Confirm
      </Button>
      {status !== "callback" ? (
        <Button size="xs" variant="outline" onClick={() => decide("callback")} disabled={pending}>
          <IconPhone data-icon="inline-start" />
          Call back
        </Button>
      ) : null}
      <Button size="xs" variant="destructive" onClick={() => decide("released")} disabled={pending}>
        <IconX data-icon="inline-start" />
        Release
      </Button>
    </div>
  );
}
