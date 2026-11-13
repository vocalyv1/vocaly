"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import { getWorkspace } from "@/lib/workspace";
import { initiateDeposit, normalizeCongoPhone, pawapayConfigured } from "@/lib/billing/pawapay";
import { PLANS, TOPUP, planPrice } from "@/lib/billing/plans";
import { createCheckout, stripeConfigured } from "@/lib/billing/stripe";
import { siteUrl } from "@/lib/site";
import { earlyBirdFor, isActive, syncPayment, type Subscription } from "@/lib/billing/subscription";

export type PayState = { ok?: boolean; message?: string; paymentId?: string };

const Pay = z.object({
  kind: z.enum(["subscription", "topup"]),
  plan: z.enum(["essentiel", "pro"]).optional(),
  period: z.enum(["monthly", "yearly"]).optional(),
  method: z.enum(["momo", "card"]).default("momo"),
  operator: z.enum(["MTN_MOMO_COG", "AIRTEL_COG"]).optional(),
  phone: z.string().trim().max(30).optional(),
});

export async function startPayment(_: PayState, form: FormData): Promise<PayState> {
  const { supabase, business, user, role } = await getWorkspace();
  if (role !== "owner" && role !== "admin") return { ok: false, message: "Seul le propriétaire du compte peut payer l'abonnement." };
  const p = Pay.safeParse(Object.fromEntries(form.entries()));
  if (!p.success) return { ok: false, message: "Formulaire incomplet." };
  const card = p.data.method === "card";
  if (card && !stripeConfigured()) return { ok: false, message: "Le paiement par carte est en cours d'activation. Contactez-nous sur WhatsApp." };
  if (!card && !pawapayConfigured()) return { ok: false, message: "Le paiement Mobile Money est en cours d'activation. Contactez-nous sur WhatsApp." };
  let phone: string | null = null;
  if (!card) {
    if (!p.data.operator) return { ok: false, message: "Choisissez votre opérateur." };
    phone = normalizeCongoPhone(p.data.phone ?? "");
    if (!phone) return { ok: false, message: "Numéro Mobile Money invalide. Exemple : 06 123 45 67." };
    if (p.data.operator === "MTN_MOMO_COG" && !phone.startsWith("24206")) return { ok: false, message: "Un numéro MTN commence par 06." };
    if (p.data.operator === "AIRTEL_COG" && !/^2420[45]/.test(phone)) return { ok: false, message: "Un numéro Airtel commence par 05 ou 04." };
  }

  const { data: subRow } = await supabase.from("subscriptions").select("*").eq("business_id", business.id).maybeSingle();
  const sub = (subRow ?? null) as Subscription | null;

  let amount: number;
  let minutes: number;
  let early = false;
  if (p.data.kind === "topup") {
    if (!isActive(sub)) return { ok: false, message: "Une recharge demande un abonnement actif." };
    amount = TOPUP.amount;
    minutes = TOPUP.minutes;
  } else {
    if (!p.data.plan || !p.data.period || !PLANS[p.data.plan]) return { ok: false, message: "Choisissez une offre." };
    early = (await earlyBirdFor(sub)).eligible;
    amount = planPrice(p.data.plan, p.data.period, early);
    minutes = PLANS[p.data.plan].minutes;
  }

  const db = createAdminClient();
  // Un seul paiement Mobile Money en attente à la fois.
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: pending } = card ? { data: null } : await db.from("payments").select("id").eq("business_id", business.id).eq("provider", "pawapay").eq("status", "pending").gte("created_at", since).limit(1).maybeSingle();
  if (pending) return { ok: true, paymentId: pending.id, message: "Un paiement est déjà en attente de validation sur votre téléphone." };

  const id = randomUUID();
  const { error } = await db.from("payments").insert({
    id, business_id: business.id, kind: p.data.kind, plan: p.data.kind === "subscription" ? p.data.plan : null,
    period: p.data.kind === "subscription" ? p.data.period : null, amount, minutes, currency: "XAF", early_bird: early,
    provider: card ? "stripe" : "pawapay", operator: card ? null : p.data.operator, phone, created_by: user.id,
  });
  if (error) {
    await logError("pawapay", "Création du paiement impossible", { error: error.message }, business.id);
    return { ok: false, message: "Paiement impossible pour le moment. Réessayez." };
  }

  if (card) {
    let url: string | null = null;
    try {
      const label = p.data.kind === "topup" ? `Vocaly, recharge ${TOPUP.minutes} minutes`
        : `Vocaly ${PLANS[p.data.plan!].name}, ${p.data.period === "yearly" ? "1 an" : "1 mois"}`;
      const session = await createCheckout({ paymentId: id, amount, label, email: user.email ?? null, siteUrl: await siteUrl() });
      await db.from("payments").update({ provider_ref: session.id }).eq("id", id);
      url = session.url;
    } catch (e) {
      await db.from("payments").update({ status: "failed", failure_reason: "Session Stripe impossible" }).eq("id", id);
      await logError("stripe", "Création de la session impossible", { id, error: String(e) }, business.id);
    }
    if (!url) return { ok: false, message: "Le paiement par carte est indisponible pour le moment. Réessayez." };
    redirect(url);
  }

  try {
    const r = await initiateDeposit({ depositId: id, phone: phone!, operator: p.data.operator!, amount });
    const status = r.body?.status as string | undefined;
    if (!r.ok || (status !== "ACCEPTED" && status !== "DUPLICATE_IGNORED")) {
      const fr = r.body?.failureReason as { failureCode?: string; failureMessage?: string } | undefined;
      await db.from("payments").update({ status: "failed", failure_reason: fr?.failureMessage ?? fr?.failureCode ?? `HTTP ${r.status}`, provider_payload: r.body }).eq("id", id);
      await logError("pawapay", "Dépôt refusé", { id, status: r.status, body: r.body }, business.id);
      const msg = fr?.failureCode === "INVALID_PHONE_NUMBER" ? "Ce numéro n'est pas reconnu par l'opérateur."
        : fr?.failureCode === "PROVIDER_TEMPORARILY_UNAVAILABLE" ? "L'opérateur est momentanément indisponible. Réessayez dans quelques minutes."
        : "Le paiement a été refusé. Vérifiez le numéro et l'opérateur, puis réessayez.";
      return { ok: false, message: msg };
    }
  } catch (e) {
    await db.from("payments").update({ status: "failed", failure_reason: "Réseau" }).eq("id", id);
    await logError("pawapay", "Appel PawaPay impossible", { id, error: String(e) }, business.id);
    return { ok: false, message: "Le service de paiement ne répond pas. Réessayez." };
  }

  revalidatePath("/app/abonnement");
  return { ok: true, paymentId: id, message: "Validez le paiement sur votre téléphone (code secret Mobile Money)." };
}

// Appelée par la page pendant l'attente : vérifie le paiement chez PawaPay.
export async function checkPayment(paymentId: string) {
  const { supabase, business } = await getWorkspace();
  if (!z.string().uuid().safeParse(paymentId).success) return { status: "not_found" };
  // La RLS garantit que le paiement appartient bien à l'entreprise de l'utilisateur.
  const { data } = await supabase.from("payments").select("id, status, failure_reason").eq("id", paymentId).eq("business_id", business.id).maybeSingle();
  if (!data) return { status: "not_found" };
  const status = data.status === "pending" ? await syncPayment(paymentId) : data.status;
  if (status !== "pending") revalidatePath("/app", "layout");
  let reason: string | null = data.failure_reason;
  if (status === "failed" && !reason) {
    const { data: again } = await supabase.from("payments").select("failure_reason").eq("id", paymentId).maybeSingle();
    reason = again?.failure_reason ?? null;
  }
  return { status, reason };
}
