import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { FunnelEvent } from "./events";

// Enregistre une étape côté serveur (paiement confirmé, agent enregistré). Ne fait jamais échouer l'action appelante.
export async function trackServer(event: FunnelEvent, o: { userId?: string | null; businessId?: string | null; path?: string | null; sessionId?: string | null; meta?: Record<string, unknown> | null } = {}) {
  if (!supabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await createAdminClient().from("funnel_events").insert({
      event, user_id: o.userId ?? null, business_id: o.businessId ?? null, path: o.path ?? null, session_id: o.sessionId ?? null, meta: o.meta ?? null,
    });
  } catch {}
}
