"use client";

import { createElement, useEffect, useRef, useState, useTransition } from "react";
import { Button, Notice } from "@/components/app/ui";
import { prepareTestAgent, startTestSession } from "./actions";

// Test dans le navigateur : on parle à l'agent de test, qui reflète le brouillon (pas l'agent en ligne).
// Chaque essai demande au serveur une session signée : l'agent de test refuse toute connexion directe.
export function TestWidget({ agentId, autoPrepare = false, testsLeft = null }: { agentId: string | null; autoPrepare?: boolean; testsLeft?: number | null }) {
  const [ready, setReady] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(testsLeft);
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
  const begin = () => start(async () => {
    setError(null);
    const r = await startTestSession();
    if (r.left !== undefined) setLeft(r.left);
    if (!r.ok || !r.signedUrl) return setError(r.message ?? "Le test n'a pas pu démarrer.");
    setSignedUrl(r.signedUrl);
  });
  return (
    <div>
      <p className="mb-3 text-sm text-gris">
        Autorisez le micro, puis parlez à votre agent comme un client au téléphone. Chaque essai dure 3 minutes au plus.
        {left != null && ` Essais gratuits restants : ${left}.`}
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {!signedUrl && left !== 0 && (
        <Button disabled={pending || !ready} onClick={begin}>{pending ? "Préparation…" : "Démarrer un essai"}</Button>
      )}
      {ready && signedUrl && (
        <div className="space-y-3">
          {createElement("elevenlabs-convai", { key: signedUrl, "signed-url": signedUrl, variant: "expanded" })}
          {left !== 0 && <Button variant="ghost" disabled={pending} onClick={begin}>Nouvel essai</Button>}
        </div>
      )}
    </div>
  );
}
