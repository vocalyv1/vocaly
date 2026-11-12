import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agent, Business } from "@/lib/workspace";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import {
  buildConversationConfig, createFileDoc, createTextDoc, createUrlDoc, providerErrorMessage, upsertProviderAgent, type KbDoc,
} from "@/lib/voice/elevenlabs";

type Source = {
  id: string; kind: string; title: string; content: string; source_ref: string | null; status: string; provider_doc_id: string | null;
};

// Envoie à ElevenLabs les documents pas encore indexés (texte, lien, fichier). Les FAQ vont dans le prompt.
async function pushPendingDocs(supabase: SupabaseClient, sources: Source[], businessId: string) {
  for (const s of sources) {
    if (s.kind === "faq" || s.provider_doc_id) continue;
    try {
      let docId: string;
      if (s.kind === "url" && s.source_ref) docId = await createUrlDoc(s.title, s.source_ref);
      else if (s.kind === "file" && s.source_ref) {
        const { data, error } = await supabase.storage.from("knowledge").download(s.source_ref);
        if (error || !data) throw new Error(error?.message ?? "Fichier introuvable dans le stockage");
        docId = await createFileDoc(s.title, data, s.source_ref.split("/").pop() ?? "document.pdf");
      } else docId = await createTextDoc(s.title, s.content || s.title);
      s.provider_doc_id = docId;
      s.status = "ready";
      await createAdminClient().from("knowledge_sources").update({ provider_doc_id: docId, status: "ready", error: null, updated_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      s.status = "error";
      await supabase.from("knowledge_sources").update({ status: "error", error: providerErrorMessage(e) }).eq("id", s.id);
      await logError("knowledge", "Indexation impossible", { sourceId: s.id, error: String(e) }, businessId);
    }
  }
}

async function loadContext(supabase: SupabaseClient, business: Business, agent: Agent) {
  const { data } = await supabase
    .from("knowledge_sources").select("id, kind, title, content, source_ref, status, provider_doc_id").eq("agent_id", agent.id).order("created_at");
  const sources = (data ?? []) as Source[];
  await pushPendingDocs(supabase, sources, business.id);
  const faq = sources.filter((s) => s.kind === "faq" && s.content.trim()).map((s) => ({ q: s.title, a: s.content }));
  const docs: KbDoc[] = sources
    .filter((s) => s.kind !== "faq" && s.provider_doc_id && s.status === "ready")
    .map((s) => ({ id: s.provider_doc_id!, name: s.title, type: s.kind === "url" ? "url" : s.kind === "file" ? "file" : "text" }));
  // Les FAQ sont « prêtes » dès qu'elles sont dans le prompt.
  await supabase.from("knowledge_sources").update({ status: "ready" }).eq("agent_id", agent.id).eq("kind", "faq").neq("status", "ready");
  return { config: buildConversationConfig(business, agent, faq, docs), faq, docs };
}

export type SyncResult = { ok: true } | { ok: false; error: string };

// Brouillon → agent de test ElevenLabs (celui qu'on essaie dans le navigateur). Les appels réels ne changent pas.
export async function syncDraft(supabase: SupabaseClient, business: Business, agent: Agent): Promise<SyncResult> {
  try {
    const { config } = await loadContext(supabase, business, agent);
    const id = await upsertProviderAgent(agent.provider_test_agent_id, `[Test] ${agent.name} · ${business.name}`, config);
    await createAdminClient().from("agents").update({ provider_test_agent_id: id, draft_synced_at: new Date().toISOString(), sync_error: null }).eq("id", agent.id);
    return { ok: true };
  } catch (e) {
    const error = providerErrorMessage(e);
    try { await createAdminClient().from("agents").update({ sync_error: error }).eq("id", agent.id); } catch {}
    await logError("sync", "Synchronisation du brouillon impossible", { agentId: agent.id, error: String(e) }, business.id);
    return { ok: false, error };
  }
}

// Publication : fige une version et met à jour l'agent « en ligne », celui qui reçoit les appels.
export async function publish(supabase: SupabaseClient, business: Business, agent: Agent, userId: string): Promise<SyncResult> {
  try {
    const { config, faq, docs } = await loadContext(supabase, business, agent);
    const id = await upsertProviderAgent(agent.provider_agent_id, `${agent.name} · ${business.name}`, config);
    const version = agent.published_version + 1;
    const settings = {
      name: agent.name, voice_id: agent.voice_id, tone: agent.tone, greeting: agent.greeting, speaks_first: agent.speaks_first,
      instructions: agent.instructions, missions: agent.missions, forbidden: agent.forbidden, unknown_behavior: agent.unknown_behavior,
      unhappy_behavior: agent.unhappy_behavior, max_call_seconds: agent.max_call_seconds, transfer_rules: agent.transfer_rules,
    };
    const { error: vErr } = await supabase
      .from("agent_versions").insert({ agent_id: agent.id, version, config: { settings, faq, docs, provider: config }, published_by: userId });
    if (vErr) throw new Error(vErr.message);
    const now = new Date().toISOString();
    await createAdminClient().from("agents").update({ provider_agent_id: id, published_version: version, published_at: now, sync_error: null, status: "live" }).eq("id", agent.id);
    return { ok: true };
  } catch (e) {
    const error = providerErrorMessage(e);
    try { await createAdminClient().from("agents").update({ sync_error: error }).eq("id", agent.id); } catch {}
    await logError("sync", "Publication impossible", { agentId: agent.id, error: String(e) }, business.id);
    return { ok: false, error };
  }
}
