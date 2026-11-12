"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logError } from "@/lib/supabase/admin";
import { getWorkspace } from "@/lib/workspace";

const PhoneRequest = z.object({
  mode: z.enum(["new_number", "forwarding", "porting"]),
  current_number: z.string().trim().max(30).optional().default(""),
  operator: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export async function requestPhone(_: { ok?: boolean; message?: string }, form: FormData) {
  const { supabase, agent, business, user } = await getWorkspace();
  if (!agent) return { ok: false, message: "Aucun agent." };
  const p = PhoneRequest.safeParse(Object.fromEntries(form.entries()));
  if (!p.success) return { ok: false, message: "Formulaire incomplet." };
  if (p.data.mode !== "new_number" && !/^\+?[0-9 ]{6,20}$/.test(p.data.current_number)) {
    return { ok: false, message: "Indiquez votre numéro actuel (format +242…)." };
  }
  const { error } = await supabase
    .from("agents")
    .update({ phone_mode: p.data.mode, phone_request: { ...p.data, requested_at: new Date().toISOString(), requested_by: user.email }, phone_status: "configuring" })
    .eq("id", agent.id);
  if (error) return { ok: false, message: "Envoi impossible. Réessayez." };
  // Visible par l'équipe Vocaly dans le journal (la mise en service est faite à la main avec l'opérateur).
  await logError("phone", "Nouvelle demande de numéro", { agentId: agent.id, ...p.data }, business.id);
  revalidatePath("/app/telephone");
  return { ok: true, message: "Demande envoyée. L'équipe Vocaly vous contacte pour la mise en service." };
}
