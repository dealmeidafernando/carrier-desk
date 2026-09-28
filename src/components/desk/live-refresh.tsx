"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-renders the server page on an interval. Following the latest call keeps polling so a new
 * call shows up on its own; a pinned call that has ended stops polling.
 */
export function LiveRefresh({ active, intervalMs = 2000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);
  return null;
}

/** mm:ss since the call started, ticking while live; the final length once it ended. */
export function CallClock({ startedAt, endedSeconds }: { startedAt: string; endedSeconds: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endedSeconds !== null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endedSeconds]);

  const seconds =
    endedSeconds ?? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span className="font-mono tabular-nums" suppressHydrationWarning>
      {mm}:{ss}
    </span>
  );
}
