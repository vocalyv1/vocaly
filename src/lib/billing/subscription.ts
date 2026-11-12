import "server-only";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import { getDeposit } from "./pawapay";
import { EARLY_BIRD } from "./plans";

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

// Relit le dépôt chez PawaPay et active l'abonnement seulement si le paiement est confirmé, au bon montant.
export async function syncPayment(paymentId: string) {
  const db = createAdminClient();
  const { data: p } = await db.from("payments").select("id, business_id, amount, currency, status").eq("id", paymentId).maybeSingle();
  if (!p) return "not_found";
  if (p.status !== "pending") return p.status as string;
  const d = await getDeposit(p.id);
  if (!d.found) return "pending";
  if (d.status === "COMPLETED") {
    if (Number(d.amount) !== p.amount || d.currency !== p.currency) {
      await logError("pawapay", "Montant ou devise différents", { paymentId, expected: p.amount, got: d.amount, currency: d.currency }, p.business_id);
      await db.from("payments").update({ status: "failed", failure_reason: "Montant reçu différent", provider_payload: d.raw }).eq("id", p.id);
      return "failed";
    }
    const { error } = await db.rpc("activate_payment", { p_id: p.id, p_payload: d.raw });
    if (error) {
      await logError("pawapay", "Activation impossible", { paymentId, error: error.message }, p.business_id);
      return "pending";
    }
    return "completed";
  }
  if (d.status === "FAILED") {
    await db.from("payments").update({ status: "failed", failure_reason: d.failureReason ?? "Paiement refusé", provider_payload: d.raw }).eq("id", p.id).eq("status", "pending");
    return "failed";
  }
  return "pending";
}
