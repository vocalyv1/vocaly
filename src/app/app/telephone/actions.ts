"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import { getWorkspace } from "@/lib/workspace";
import { isActive } from "@/lib/billing/subscription";
import { toCongoE164 } from "@/lib/phone/number";
import { importBusinessNumber, routingConfigured } from "@/lib/phone/routing";
import { providerErrorMessage } from "@/lib/voice/elevenlabs";

type State = { ok?: boolean; message?: string };

const PhoneRequest = z.object({
  current_number: z.string().trim().max(30),
  operator: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

// L'entreprise garde son numéro : on le relie à son agent, puis elle y active le renvoi vers le numéro Vocaly.
export async function requestPhone(_: State, form: FormData): Promise<State> {
  const { supabase, agent, business, user } = await getWorkspace();
  if (!agent) return { ok: false, message: "Aucun agent." };
  const { data: sub } = await supabase.from("subscriptions").select("status, paid_until").eq("business_id", business.id).maybeSingle();
  if (!isActive(sub)) return { ok: false, message: "Choisissez d'abord une offre dans « Abonnement »." };
  const p = PhoneRequest.safeParse(Object.fromEntries(form.entries()));
  if (!p.success) return { ok: false, message: "Formulaire incomplet." };
  const number = toCongoE164(p.data.current_number);
  if (!number) return { ok: false, message: "Indiquez le numéro de votre entreprise (numéro congolais, par exemple 06 123 45 67)." };
  if (!agent.provider_agent_id) return { ok: false, message: "Publiez d'abord votre agent depuis « Mon agent »." };

  const db = createAdminClient();
  const { data: existing } = await db.from("phone_routes").select("business_id, provider_phone_number_id").eq("number", number).maybeSingle();
  if (existing && existing.business_id !== business.id) {
    await logError("phone", "Numéro déjà relié à une autre entreprise", { number, agentId: agent.id }, business.id);
    return { ok: false, message: "Ce numéro est déjà relié à un autre compte Vocaly. Contactez-nous sur WhatsApp." };
  }

  let providerId = existing?.provider_phone_number_id ?? null;
  if (routingConfigured() && !providerId) {
    try {
      providerId = await importBusinessNumber(number, `${business.name} · ${number}`, agent.provider_agent_id);
    } catch (e) {
      await logError("phone", "Liaison du numéro impossible", { number, error: e instanceof Error ? e.message : String(e) }, business.id);
      return { ok: false, message: providerErrorMessage(e) };
    }
  }
  const { error: routeError } = await db
    .from("phone_routes")
    .upsert({ number, business_id: business.id, agent_id: agent.id, provider_phone_number_id: providerId }, { onConflict: "number" });
  if (routeError) {
    await logError("phone", "Enregistrement de la route impossible", { number, error: routeError.message }, business.id);
    return { ok: false, message: "Enregistrement impossible. Réessayez." };
  }
  // « Connecté » n'est posé qu'au premier appel réel reçu par l'agent (webhook ElevenLabs).
  const { error } = await db
    .from("agents")
    .update({
      phone_mode: "forwarding",
      phone_number: number,
      phone_status: "configuring",
      phone_request: { ...p.data, current_number: number, requested_at: new Date().toISOString(), requested_by: user.email, linked: Boolean(providerId) },
    })
    .eq("id", agent.id);
  if (error) return { ok: false, message: "Envoi impossible. Réessayez." };
  if (!providerId) await logError("phone", "Numéro à relier à la main (routage non configuré)", { number, agentId: agent.id }, business.id);
  revalidatePath("/app/telephone");
  return { ok: true, message: providerId ? "Numéro relié à votre agent. Suivez les étapes ci-dessous." : "Demande enregistrée. L'équipe Vocaly finalise la mise en service." };
}
