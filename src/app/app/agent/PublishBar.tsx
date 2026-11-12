"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/app/ui";
import { publishAgent } from "./actions";

export function PublishBar({ hasChanges, version }: { hasChanges: boolean; version: number }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="space-y-3">
      <Button
        disabled={pending || (!hasChanges && version > 0)}
        onClick={() => start(async () => setResult(await publishAgent()))}
      >
        {pending ? "Publication…" : version === 0 ? "Publier la première version" : "Publier les modifications"}
      </Button>
      {result && <Notice tone={result.ok ? "ok" : "error"}>{result.message}</Notice>}
    </div>
  );
}
