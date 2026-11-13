"use client";

import { createElement, useEffect, useRef, useState, useTransition } from "react";
import { Button, Notice } from "@/components/app/ui";
import { prepareTestAgent } from "./actions";

// Test dans le navigateur : on parle à l'agent de test, qui reflète le brouillon (pas l'agent en ligne).
export function TestWidget({ agentId, autoPrepare = false }: { agentId: string | null; autoPrepare?: boolean }) {
  const [ready, setReady] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Juste après la création de l'agent : on prépare le test sans attendre un clic.
  const asked = useRef(false);
  useEffect(() => {
    if (agentId || !autoPrepare || asked.current) return;
    asked.current = true;
    start(async () => { const r = await prepareTestAgent(); if (!r.ok) setError(r.message); });
  }, [agentId, autoPrepare]);

  useEffect(() => {
    if (!agentId) return;
    if (document.querySelector("script[data-el-widget]")) return setReady(true);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed@0.22.2";
    s.async = true;
    s.dataset.elWidget = "1";
    s.onload = () => setReady(true);
    s.onerror = () => setError("Le module de test vocal n'a pas pu être chargé.");
    document.body.appendChild(s);
  }, [agentId]);

  if (!agentId) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gris">L&apos;agent de test n&apos;est pas encore créé.</p>
        <Button variant="ghost" disabled={pending} onClick={() => start(async () => {
          const r = await prepareTestAgent();
          if (!r.ok) setError(r.message);
        })}>
          {pending ? "Préparation…" : "Préparer le test"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    );
  }
  return (
    <div>
      <p className="mb-3 text-sm text-gris">Autorisez le micro, puis parlez à votre agent comme un client au téléphone. Ces essais apparaissent dans « Appels » avec la mention Test.</p>
      {error && <Notice tone="error">{error}</Notice>}
      {ready && createElement("elevenlabs-convai", { "agent-id": agentId, variant: "expanded" })}
    </div>
  );
}
