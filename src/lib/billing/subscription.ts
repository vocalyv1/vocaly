import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import { getDeposit } from "./pawapay";
import { EARLY_BIRD } from "./plans";
import { stripe, stripeConfigured } from "./stripe";
import { trackServer } from "@/lib/funnel/server";

export type Subscription = {
  business_id: string; plan: string; period: string; minutes_included: number; status: string;
  paid_until: string | null; current_period_start: string | null; usage_period_start: string | null;
  seconds_used: number; extra_seconds: number; early_bird_until: string | null;
};

export function isActive(s: Pick<Subscription, "status" | "paid_until"> | null | undefined) {
  return Boolean(s && s.status === "active" && s.paid_until && new Date(s.paid_until) > new Date());
}

// La réduction s'applique si l'entreprise l'a déjà obtenue (pendant sa première année) ou s'il reste des places.
export async function earlyBirdFor(sub: Subscription | null) {
  if (sub?.early_bird_until) return { eligible: new Date(sub.early_bird_until) > new Date(), left: null as number | null };
  if (sub) return { eligible: false, left: null };
  const { data, error } = await createAdminClient().rpc("early_bird_taken");
  if (error) return { eligible: false, left: null };
  const left = Math.max(0, EARLY_BIRD.slots - Number(data ?? 0));
  return { eligible: left > 0, left };
}

// Offre de sortie encore valable pour cette entreprise (lue avec la RLS).
export async function validExitOffer(supabase: SupabaseClient, businessId: string) {
  const { data } = await supabase.from("offers").select("id, discount, expires_at, used_at").eq("business_id", businessId).eq("kind", "exit_annual").maybeSingle();
  if (!data || data.used_at || new Date(data.expires_at) <= new Date()) return null;
  return data as { id: string; discount: number; expires_at: string };
}

type PaymentRow = { id: string; business_id: string; amount: number; currency: string; status: string; provider: string; provider_ref: string | null };

async function activate(p: PaymentRow, payload: unknown, source: string) {
  const { data, error } = await createAdminClient().rpc("activate_payment", { p_id: p.id, p_payload: payload });
  if (error) {
    await logError(source, "Activation impossible", { paymentId: p.id, error: error.message }, p.business_id);
    return "pending";
  }
  if (data !== "already") await trackServer("payment_completed", { businessId: p.business_id, meta: { provider: p.provider, amount: p.amount, result: String(data) } });
  return "completed";
}

// Relit le paiement chez le prestataire (PawaPay ou Stripe) et active l'abonnement seulement s'il est confirmé, au bon montant.
export async function syncPayment(paymentId: string) {
  const db = createAdminClient();
  const { data } = await db.from("payments").select("id, business_id, amount, currency, status, provider, provider_ref").eq("id", paymentId).maybeSingle();
  const p = data as PaymentRow | null;
  if (!p) return "not_found";
  if (p.status !== "pending") return p.status;
  return p.provider === "stripe" ? syncStripe(p) : syncPawapay(p);
}

async function syncStripe(p: PaymentRow) {
  if (!stripeConfigured() || !p.provider_ref) return "pending";
  const db = createAdminClient();
  const s = await stripe().checkout.sessions.retrieve(p.provider_ref);
  if (s.client_reference_id !== p.id) {
    await logError("stripe", "Session ne correspondant pas au paiement", { paymentId: p.id, session: s.id }, p.business_id);
    return "pending";
  }
  if (s.payment_status === "paid") {
    if (s.amount_total !== p.amount || s.currency?.toUpperCase() !== p.currency) {
      await logError("stripe", "Montant ou devise différents", { paymentId: p.id, expected: p.amount, got: s.amount_total, currency: s.currency }, p.business_id);
      await db.from("payments").update({ status: "failed", failure_reason: "Montant reçu différent" }).eq("id", p.id);
      return "failed";
    }
    return activate(p, { session: s.id, payment_intent: s.payment_intent, amount_total: s.amount_total, currency: s.currency }, "stripe");
  }
  if (s.status === "expired") {
    await db.from("payments").update({ status: "failed", failure_reason: "Paiement non finalisé" }).eq("id", p.id).eq("status", "pending");
    return "failed";
  }
  return "pending";
}

async function syncPawapay(p: PaymentRow) {
  const db = createAdminClient();
  const paymentId = p.id;
  const d = await getDeposit(p.id);
  if (!d.found) return "pending";
  if (d.status === "COMPLETED") {
    if (Number(d.amount) !== p.amount || d.currency !== p.currency) {
      await logError("pawapay", "Montant ou devise différents", { paymentId, expected: p.amount, got: d.amount, currency: d.currency }, p.business_id);
      await db.from("payments").update({ status: "failed", failure_reason: "Montant reçu différent", provider_payload: d.raw }).eq("id", p.id);
      return "failed";
    }
    return activate(p, d.raw, "pawapay");
  }
  if (d.status === "FAILED") {
    await db.from("payments").update({ status: "failed", failure_reason: d.failureReason ?? "Paiement refusé", provider_payload: d.raw }).eq("id", p.id).eq("status", "pending");
    return "failed";
  }
  return "pending";
}
