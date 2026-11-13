"use client";

import { useEffect } from "react";
import type { FunnelEvent } from "@/lib/funnel/events";
import { trackOnce } from "@/lib/funnel/track";

// Enregistre l'affichage d'une page du parcours (une fois par visite).
export function TrackView({ event }: { event: FunnelEvent }) {
  useEffect(() => { trackOnce(event); }, [event]);
  return null;
}
