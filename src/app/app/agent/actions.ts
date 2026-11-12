"use server";

import { revalidatePath } from "next/cache";
import { AgentSettingsSchema } from "@/lib/agent/schema";
import { publish, syncDraft } from "@/lib/agent/sync";
import { elevenLabsConfigured } from "@/lib/voice/elevenlabs";
import { getWorkspace, type Agent } from "@/lib/workspace";

export type ActionResult = { ok: boolean; message: string };

// Enregistre le brouillon puis met à jour l'agent de test. L'agent en ligne ne change qu'à la publication.
export async function saveAgentSettings(input: unknown): Promise<ActionResult> {
  const { supabase, agent, business } = await getWorkspace();
  if (!agent) return { ok: false, message: "Aucun agent trouvé pour cette entreprise." };
  const parsed = AgentSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Réglages invalides." };
  const s = parsed.data;
  const { data: updated, error } = await supabase
    .from("agents")
    .update({ ...s, transfer_rules: s.transfer_rules.filter((r) => r.phone), updated_at: new Date().toISOString() })
    .eq("id", agent.id)
    .select("*")
    .single();
  if (error || !updated) return { ok: false, message: "Enregistrement impossible. Réessayez." };
  revalidatePath("/app/agent");
  if (!elevenLabsConfigured()) return { ok: true, message: "Brouillon enregistré. Le test vocal sera disponible dès que le service vocal sera branché." };
  const sync = await syncDraft(supabase, business, updated as Agent);
  return sync.ok
    ? { ok: true, message: "Brouillon enregistré. Vous pouvez le tester ci-dessous, puis le publier." }
    : { ok: false, message: `Brouillon enregistré, mais l'agent de test n'a pas pu être mis à jour : ${sync.error}` };
}

export async function prepareTestAgent(): Promise<ActionResult> {
  const { supabase, agent, business } = await getWorkspace();
  if (!agent) return { ok: false, message: "Aucun agent trouvé." };
  if (!elevenLabsConfigured()) return { ok: false, message: "Le service vocal n'est pas encore branché (clé ElevenLabs manquante)." };
  const r = await syncDraft(supabase, business, agent);
  revalidatePath("/app/agent");
  return r.ok ? { ok: true, message: "Agent de test prêt." } : { ok: false, message: r.error };
}

export async function publishAgent(): Promise<ActionResult> {
  const { supabase, agent, business, user } = await getWorkspace();
  if (!agent) return { ok: false, message: "Aucun agent trouvé." };
  if (!elevenLabsConfigured()) return { ok: false, message: "Publication impossible : le service vocal n'est pas encore branché (clé ElevenLabs manquante)." };
  const r = await publish(supabase, business, agent, user.id);
  revalidatePath("/app/agent");
  revalidatePath("/app");
  return r.ok
    ? { ok: true, message: `Version ${agent.published_version + 1} publiée. Elle répondra aux appels dès que votre numéro sera connecté.` }
    : { ok: false, message: r.error };
}
