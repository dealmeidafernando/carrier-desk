"use client";

import { useTransition } from "react";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setAgentPaused } from "@/lib/desk/actions";
import type { KillSwitch as KillSwitchState } from "@/lib/desk/types";

export function KillSwitch({ state, since }: { state: KillSwitchState; since: string | null }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !state.paused;
    if (
      next &&
      !window.confirm(
        "Pause the agent? New callers will be told a rep will call them back. No codes are sent and no loads are quoted."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await setAgentPaused(next);
      if (result.ok) toast.success(next ? "Agent paused" : "Agent live again");
      else toast.error(result.error);
    });
  }

  return (
    <Card size="sm" className={state.paused ? "ring-destructive/40" : undefined}>
      <CardHeader>
        <CardDescription>Voice agent</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            aria-hidden
            className={`size-2 rounded-full ${state.paused ? "bg-destructive" : "bg-success"}`}
          />
          {state.paused ? "Paused" : "Live"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {state.paused
            ? `Paused by ${state.by ?? "ops"}${since ? ` · ${since}` : ""}. Callers get a rep callback.`
            : "Taking inbound carrier calls."}
        </p>
        <CardAction>
          <Button
            size="sm"
            variant={state.paused ? "default" : "destructive"}
            onClick={toggle}
            disabled={pending}
          >
            {state.paused ? (
              <IconPlayerPlay data-icon="inline-start" />
            ) : (
              <IconPlayerPause data-icon="inline-start" />
            )}
            {state.paused ? "Resume" : "Pause agent"}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
