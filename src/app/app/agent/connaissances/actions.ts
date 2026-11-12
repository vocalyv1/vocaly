"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncDraft } from "@/lib/agent/sync";
import { deleteDoc, elevenLabsConfigured } from "@/lib/voice/elevenlabs";
import { logError } from "@/lib/supabase/admin";
import { getWorkspace } from "@/lib/workspace";

export type KState = { ok?: boolean; message?: string };

import { CATEGORIES } from "@/lib/knowledge";
const MAX_FILE = 4 * 1024 * 1024;
const FILE_TYPES = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/markdown"];

const Base = z.object({ category: z.enum(CATEGORIES).catch("general") });
const TextIn = Base.extend({ title: z.string().trim().min(2, "Donnez un titre.").max(120), content: z.string().trim().min(10, "Le texte est trop court.").max(50000) });
const FaqIn = Base.extend({ title: z.string().trim().min(5, "La question est trop courte.").max(300), content: z.string().trim().min(2, "Écrivez la réponse.").max(3000) });
const UrlIn = Base.extend({ title: z.string().trim().max(120).optional(), url: z.url("Lien invalide (il doit commencer par https://).").refine((u) => u.startsWith("https://") || u.startsWith("http://")) });

async function afterChange() {
  const ws = await getWorkspace();
  revalidatePath("/app/agent/connaissances");
  if (ws.agent && elevenLabsConfigured()) {
    const r = await syncDraft(ws.supabase, ws.business, ws.agent);
    if (!r.ok) return { ok: true, message: `Enregistré. La mise à jour de l'agent de test a échoué : ${r.error}` };
    return { ok: true, message: "Enregistré. L'agent de test est à jour ; publiez pour l'appliquer aux appels réels." };
  }
  return { ok: true, message: "Enregistré. L'indexation se fera dès que le service vocal sera branché." };
}

export async function addKnowledge(_: KState, form: FormData): Promise<KState> {
  const { supabase, agent, business } = await getWorkspace();
  if (!agent) return { ok: false, message: "Aucun agent." };
  const kind = String(form.get("kind"));
  const raw = Object.fromEntries(form.entries());

  if (kind === "text" || kind === "faq") {
    const p = (kind === "faq" ? FaqIn : TextIn).safeParse(raw);
    if (!p.success) return { ok: false, message: p.error.issues[0].message };
    const { error } = await supabase.from("knowledge_sources").insert({
      agent_id: agent.id, kind, title: p.data.title, content: p.data.content, category: kind === "faq" ? "faq" : p.data.category,
      status: "pending", size_bytes: p.data.content.length,
    });
    if (error) return { ok: false, message: "Enregistrement impossible." };
  } else if (kind === "url") {
    const p = UrlIn.safeParse(raw);
    if (!p.success) return { ok: false, message: p.error.issues[0].message };
    const { error } = await supabase.from("knowledge_sources").insert({
      agent_id: agent.id, kind, title: p.data.title || new URL(p.data.url).hostname, source_ref: p.data.url, category: p.data.category, status: "pending",
    });
    if (error) return { ok: false, message: "Enregistrement impossible." };
  } else if (kind === "file") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choisissez un fichier." };
    if (file.size > MAX_FILE) return { ok: false, message: "Fichier trop lourd (4 Mo maximum)." };
    if (!FILE_TYPES.includes(file.type)) return { ok: false, message: "Format accepté : PDF, Word (.docx), texte." };
    const safe = file.name.normalize("NFD").replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `${business.id}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("knowledge").upload(path, file, { contentType: file.type });
    if (upErr) {
      await logError("knowledge", "Envoi du fichier impossible", { error: upErr.message }, business.id);
      return { ok: false, message: "Envoi du fichier impossible." };
    }
    const title = String(form.get("title") || "").trim() || file.name;
    const category = Base.parse(raw).category;
    const { error } = await supabase.from("knowledge_sources").insert({
      agent_id: agent.id, kind, title: title.slice(0, 120), source_ref: path, category, status: "pending", size_bytes: file.size,
    });
    if (error) return { ok: false, message: "Enregistrement impossible." };
  } else return { ok: false, message: "Type inconnu." };

  return afterChange();
}

export async function deleteKnowledge(id: string): Promise<KState> {
  const { supabase } = await getWorkspace();
  const { data: src } = await supabase.from("knowledge_sources").select("id, kind, source_ref, provider_doc_id").eq("id", id).maybeSingle();
  if (!src) return { ok: false, message: "Introuvable." };
  const { error } = await supabase.from("knowledge_sources").delete().eq("id", id);
  if (error) return { ok: false, message: "Suppression impossible." };
  // On resynchronise d'abord (le document n'est plus attaché), puis on le supprime chez ElevenLabs.
  const r = await afterChange();
  if (src.kind === "file" && src.source_ref) await supabase.storage.from("knowledge").remove([src.source_ref]);
  if (src.provider_doc_id && elevenLabsConfigured()) {
    try { await deleteDoc(src.provider_doc_id); } catch (e) { await logError("knowledge", "Suppression du document ElevenLabs impossible", { error: String(e) }); }
  }
  return { ...r, message: "Supprimé." };
}

// Modification d'un texte ou d'une FAQ : le document indexé est recréé.
export async function updateKnowledge(id: string, title: string, content: string): Promise<KState> {
  const { supabase } = await getWorkspace();
  const { data: src } = await supabase.from("knowledge_sources").select("id, kind, provider_doc_id").eq("id", id).maybeSingle();
  if (!src || (src.kind !== "text" && src.kind !== "faq")) return { ok: false, message: "Modification impossible." };
  const p = (src.kind === "faq" ? FaqIn : TextIn).safeParse({ title, content });
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { error } = await supabase.from("knowledge_sources").update({
    title: p.data.title, content: p.data.content, status: "pending", provider_doc_id: null, error: null, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, message: "Enregistrement impossible." };
  const r = await afterChange();
  if (src.provider_doc_id && elevenLabsConfigured()) {
    try { await deleteDoc(src.provider_doc_id); } catch {}
  }
  return r;
}
