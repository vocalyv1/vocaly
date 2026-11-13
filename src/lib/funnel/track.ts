"use client";

import type { FunnelEvent } from "./events";

// Identifiant de visite anonyme (aucune donnée personnelle), gardé dans le navigateur.
function sessionId() {
  try {
    let id = localStorage.getItem("vocaly-sid");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("vocaly-sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

// Envoie une étape du parcours au serveur, sans bloquer la page.
export function track(event: FunnelEvent, meta?: Record<string, string | number | boolean | null>) {
  try {
    const body = JSON.stringify({ event, sid: sessionId(), path: location.pathname, meta: meta ?? null });
    if (navigator.sendBeacon?.(new URL("/api/track", location.origin), new Blob([body], { type: "application/json" }))) return;
    fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {}
}

// Une seule fois par visite (ex. paywall_view).
export function trackOnce(event: FunnelEvent, meta?: Record<string, string | number | boolean | null>) {
  try {
    const k = `vocaly-t-${event}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {}
  track(event, meta);
}
