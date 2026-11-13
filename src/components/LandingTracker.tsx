"use client";

import { useEffect } from "react";
import { track, trackOnce } from "@/lib/funnel/track";

// Page d'accueil : une visite, puis chaque clic vers la création de l'agent (avec la section d'origine).
export function LandingTracker() {
  useEffect(() => {
    trackOnce("landing_view", { ref: document.referrer ? new URL(document.referrer).hostname.slice(0, 60) : null, utm: new URLSearchParams(location.search).get("utm_source")?.slice(0, 60) ?? null });
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a");
      const href = a?.getAttribute("href") ?? "";
      if (!a || !(href.startsWith("/onboarding") || href.startsWith("https://wa.me"))) return;
      track("cta_click", { to: href.startsWith("/") ? href : "whatsapp", section: a.closest("section, header")?.id || a.closest("section, header")?.className.split(" ")[0] || null, label: (a.textContent ?? "").trim().slice(0, 60) });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
