"use client";

import { useEffect } from "react";
import { play } from "./sound";

// Petit clic sur les boutons de l'espace client ; son de réussite / d'erreur quand un message apparaît.
export function SoundEffects() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("button, [role=tab], input[type=checkbox], input[type=radio], select");
      if (el && !el.closest("[data-silent]")) play("tick");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

export function PlayOnMount({ kind }: { kind: "success" | "error" }) {
  useEffect(() => play(kind), [kind]);
  return null;
}
