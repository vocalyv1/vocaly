import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Business = {
  id: string; name: string; sector: string; city: string | null; description: string | null; address: string | null;
  phone: string | null; email: string | null; hours: string | null; closed_days: string | null; timezone: string;
  website_url: string | null; owner_id: string;
};

export type Agent = {
  id: string; business_id: string; name: string; voice_id: string; role: string; instructions: string; greeting: string;
  speaks_first: boolean; max_call_seconds: number; transfer_rules: { label: string; phone: string; when: string }[];
  tags: { name: string; description: string }[]; tone: string; language: string; missions: string | null; forbidden: string | null;
  unknown_behavior: string; unhappy_behavior: string | null; enabled: boolean; provider_agent_id: string | null;
  provider_test_agent_id: string | null; draft_synced_at: string | null; published_version: number; published_at: string | null;
  phone_status: string; phone_mode: string | null; phone_request: Record<string, string>; phone_number: string | null;
  sync_error: string | null; updated_at: string;
};

// Espace de travail de l'utilisateur connecté : son entreprise et son agent (via la RLS).
// Sans entreprise, l'utilisateur est renvoyé vers l'onboarding.
export const getWorkspace = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { data: member } = await supabase
    .from("business_members").select("business_id, role").eq("user_id", auth.user.id).order("created_at").limit(1).maybeSingle();
  if (!member) redirect("/onboarding");
  const { data: business } = await supabase.from("businesses").select("*").eq("id", member.business_id).single();
  const { data: agent } = await supabase
    .from("agents").select("*").eq("business_id", member.business_id).order("created_at").limit(1).maybeSingle();
  if (!business) redirect("/onboarding");
  return { supabase, user: auth.user, role: member.role as string, business: business as Business, agent: (agent ?? null) as Agent | null };
});
