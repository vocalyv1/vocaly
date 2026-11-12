"use client";

import { useTransition } from "react";
import { Button } from "@/components/app/ui";
import { retryReport, setCallStatus } from "../actions";

export function CallActions({ id, status, canRetry }: { id: string; status: string; canRetry: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "resolved" && (
        <Button disabled={pending} onClick={() => start(() => setCallStatus(id, "resolved"))}>Marquer comme traité</Button>
      )}
      {status === "resolved" && (
        <Button variant="ghost" disabled={pending} onClick={() => start(() => setCallStatus(id, "unresolved"))}>Remettre à traiter</Button>
      )}
      {canRetry && (
        <Button variant="ghost" disabled={pending} onClick={() => start(() => retryReport(id))}>{pending ? "Analyse…" : "Relancer l'analyse"}</Button>
      )}
    </div>
  );
}
