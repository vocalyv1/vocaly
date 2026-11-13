"use client";

import { useTransition } from "react";
import { markFollowUpDone } from "./actions";
import { play } from "@/components/app/sound";

export function FollowUpDone({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" data-silent disabled={pending} onClick={() => start(async () => { await markFollowUpDone(id); play("success"); })}
      className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-sur-brand disabled:opacity-50">
      {pending ? "…" : "✓ Fait"}
    </button>
  );
}
