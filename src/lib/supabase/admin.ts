import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// Clé service : contourne la RLS. Uniquement côté serveur (webhooks, tâches internes).
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Journalise une erreur technique, sans jamais faire échouer l'appelant.
export async function logError(source: string, message: string, details?: unknown, businessId?: string | null) {
  console.error(`[${source}] ${message}`, details ?? "");
  try {
    await createAdminClient().from("error_logs").insert({ source, message, details: details ?? null, business_id: businessId ?? null });
  } catch {}
}
