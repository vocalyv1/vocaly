"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncDraft } from "@/lib/agent/sync";
import { elevenLabsConfigured } from "@/lib/voice/elevenlabs";
import { getWorkspace, type Business } from "@/lib/workspace";

const opt = (n: number) => z.string().trim().max(n).optional().default("");
const BusinessIn = z.object({
  name: z.string().trim().min(2, "Nom de l'entreprise trop court.").max(120),
  description: opt(1000), address: opt(300), phone: opt(30), email: z.union([z.literal(""), z.email("E-mail invalide.")]).default(""),
  website_url: opt(300), hours: opt(500), closed_days: opt(200), full_name: opt(120),
});

export async function saveAccount(_: { ok?: boolean; message?: string }, form: FormData) {
  const { supabase, business, agent, user } = await getWorkspace();
  const p = BusinessIn.safeParse(Object.fromEntries(form.entries()));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const { full_name, ...b } = p.data;
  const clean = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v === "" && k !== "name" ? null : v]));
  const { data: updated, error } = await supabase
    .from("businesses").update({ ...clean, updated_at: new Date().toISOString() }).eq("id", business.id).select("*").single();
  if (error || !updated) return { ok: false, message: "Enregistrement impossible." };
  await supabase.from("profiles").upsert({ id: user.id, full_name: full_name || null });
  revalidatePath("/app", "layout");
  // Les infos de l'entreprise font partie du prompt : on met l'agent de test à jour.
  if (agent && elevenLabsConfigured()) await syncDraft(supabase, updated as Business, agent);
  return { ok: true, message: "Enregistré. Publiez votre agent pour appliquer ces informations aux appels réels." };
}
