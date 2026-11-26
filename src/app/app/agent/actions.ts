"use server";

import { revalidatePath } from "next/cache";
import { AgentSettingsSchema } from "@/lib/agent/schema";
import { publish, syncDraft } from "@/lib/agent/sync";
import { countTestConversations, elevenLabsConfigured, providerErrorMessage, testSessionUrl, TEST_LIMITS } from "@/lib/voice/elevenlabs";
import { isActive, type Subscription } from "@/lib/billing/subscription";
import { logError } from "@/lib/supabase/admin";
import { getWorkspace, type Agent } from "@/lib/workspace";

// Date de mise en place de la limite d'essais (agents de test synchronisés avant : à resynchroniser).
const TEST_LIMIT_SINCE = new Date("2026-11-26T22:30:00Z");

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

// Démarre un essai dans le navigateur. Avant paiement : 5 essais de 3 minutes au plus, comptés chez ElevenLabs.
export async function startTestSession(): Promise<{ ok: boolean; message?: string; signedUrl?: string; left?: number | null }> {
  const { supabase, agent, business } = await getWorkspace();
  if (!agent?.provider_test_agent_id) return { ok: false, message: "L'agent de test n'est pas encore prêt." };
  if (!elevenLabsConfigured()) return { ok: false, message: "Le service vocal n'est pas encore branché." };
  try {
    const { data: sub } = await supabase.from("subscriptions").select("*").eq("business_id", business.id).maybeSingle();
    let left: number | null = null;
    if (!isActive(sub as Subscription | null)) {
      const used = await countTestConversations(agent.provider_test_agent_id);
      left = Math.max(0, TEST_LIMITS.calls - used);
      if (left === 0) return { ok: false, left: 0, message: `Vous avez utilisé vos ${TEST_LIMITS.calls} essais gratuits. Activez votre agent pour continuer à le tester et le relier à votre numéro.` };
    }
    // Agents de test créés avant la limite : on les resynchronise une fois (privés, 3 minutes max).
    if (!agent.draft_synced_at || new Date(agent.draft_synced_at) < TEST_LIMIT_SINCE) {
      const r = await syncDraft(supabase, business, agent);
      if (!r.ok) return { ok: false, message: r.error };
    }
    const signedUrl = await testSessionUrl(agent.provider_test_agent_id);
    return { ok: true, signedUrl, left: left == null ? null : left - 1 };
  } catch (e) {
    await logError("test", "Démarrage de l'essai impossible", { agentId: agent.id, error: String(e) }, business.id);
    return { ok: false, message: providerErrorMessage(e) };
  }
}
