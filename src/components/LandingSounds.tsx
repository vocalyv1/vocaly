"use client";

import { useEffect } from "react";
import { play } from "@/components/app/sound";

// Page d'accueil : même son que dans l'espace client au choix d'une section et au clic sur un bouton.
// Le volume réglé dans l'espace client s'applique ici aussi (même navigateur).
export function LandingSounds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.("a, button, summary");
      if (el && !el.closest("[data-silent]")) play("tick");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
