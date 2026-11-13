import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, TOPUP, formatFcfa, isPlan } from "./plans";
import { isActive, type Subscription } from "./subscription";

const DAY = 864e5;

export function daysLeft(sub: Pick<Subscription, "paid_until"> | null) {
  if (!sub?.paid_until) return null;
  return Math.ceil((new Date(sub.paid_until).getTime() - Date.now()) / DAY);
}

export function dayLabel(iso: string, tz: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: tz }).format(new Date(iso));
}

// Part des minutes de l'offre déjà utilisée ce mois-ci (0 à 100+), et minutes de recharge restantes.
export function usage(sub: Subscription | null) {
  if (!sub || !sub.minutes_included) return null;
  const pct = Math.round(((sub.seconds_used ?? 0) / (sub.minutes_included * 60)) * 100);
  return { pct, extraMin: Math.floor((sub.extra_seconds ?? 0) / 60) };
}

export type Notice = { tone: "warn" | "error" | "info"; text: string; cta: string; href: string };

// Bandeaux de l'espace client : fin d'offre proche, offre expirée, minutes presque épuisées.
export function accountNotices(sub: Subscription | null, tz: string): Notice[] {
  const out: Notice[] = [];
  if (!sub) return out;
  const left = daysLeft(sub);
  if (sub.paid_until && !isActive(sub)) {
    out.push({ tone: "error", text: `Votre offre a expiré le ${dayLabel(sub.paid_until, tz)}. Renouvelez-la pour continuer à utiliser votre agent.`, cta: "Renouveler", href: "/app/abonnement" });
    return out;
  }
  if (left != null && left <= 7 && sub.paid_until) {
    const when = left <= 0 ? "aujourd'hui" : left === 1 ? "demain" : `le ${dayLabel(sub.paid_until, tz)} (dans ${left} jours)`;
    const pay = sub.payment_provider === "stripe" ? "par carte" : "par Mobile Money";
    out.push({ tone: left <= 3 ? "error" : "warn", text: `Votre offre se termine ${when}. Le renouvellement n'est pas automatique : payez ${pay} pour prolonger sans interruption.`, cta: "Renouveler", href: "/app/abonnement" });
  }
  const u = usage(sub);
  if (u && u.extraMin === 0 && u.pct >= 80) {
    out.push({
      tone: u.pct >= 100 ? "error" : "warn",
      text: u.pct >= 100
        ? `Vous avez utilisé toutes les minutes de votre offre ce mois-ci (${sub.minutes_included} min).`
        : `Vous avez utilisé ${u.pct} % des minutes de votre offre ce mois-ci.`,
      cta: `Ajouter ${TOPUP.minutes} min`, href: "/app/abonnement?recharge=1",
    });
  }
  return out;
}

// Propositions calculées sur l'usage réel : passer à Pro, passer à l'annuel.
export async function upgradeHints(supabase: SupabaseClient, businessId: string, sub: Subscription | null) {
  const hints: { title: string; text: string; cta: string; href: string }[] = [];
  if (!sub || !isActive(sub) || !isPlan(sub.plan)) return hints;

  // Pro : les deux derniers mois complets ont dépassé les minutes de l'offre Essentiel.
  if (sub.plan === "essentiel" && sub.usage_period_start) {
    const start = new Date(sub.usage_period_start);
    const p1 = new Date(start); p1.setUTCMonth(p1.getUTCMonth() - 1);
    const p2 = new Date(start); p2.setUTCMonth(p2.getUTCMonth() - 2);
    const { data } = await supabase.from("calls").select("created_at, duration_seconds")
      .eq("business_id", businessId).eq("channel", "phone").eq("is_test", false)
      .gte("created_at", p2.toISOString()).lt("created_at", start.toISOString()).limit(10000);
    const m = [0, 0];
    for (const c of data ?? []) m[new Date(c.created_at) >= p1 ? 1 : 0] += c.duration_seconds ?? 0;
    const [a, b] = m.map((s) => Math.ceil(s / 60));
    const incl = PLANS.essentiel.minutes;
    if (a > incl && b > incl) {
      const avg = Math.max(a, b);
      const topups = Math.ceil((avg - incl) / TOPUP.minutes);
      const costNow = PLANS.essentiel.monthly + topups * TOPUP.amount;
      hints.push({
        title: "Passez à Pro",
        text: `Ces deux derniers mois, vos appels ont duré ${a} puis ${b} minutes, pour ${incl} incluses. Pro inclut ${PLANS.pro.minutes} minutes pour ${formatFcfa(PLANS.pro.monthly)} par mois${costNow > PLANS.pro.monthly ? `, contre ${formatFcfa(costNow)} avec Essentiel et des recharges` : ""}.`,
        cta: "Voir l'offre Pro", href: "/app/abonnement",
      });
    }
  }

  // Annuel : client au mois qui a déjà payé au moins deux mois.
  if (sub.period === "monthly") {
    const { count } = await supabase.from("payments").select("id", { count: "exact", head: true })
      .eq("business_id", businessId).eq("kind", "subscription").eq("period", "monthly").eq("status", "completed");
    if ((count ?? 0) >= 2) {
      const p = PLANS[sub.plan];
      hints.push({
        title: "Passez à l'annuel",
        text: `Avec ${p.name} au mois, vous payez ${formatFcfa(p.monthly * 12)} par an. En annuel : ${formatFcfa(p.yearly)}, soit ${formatFcfa(p.monthly * 12 - p.yearly)} d'économie (2 mois offerts). La période annuelle démarre au paiement : le meilleur moment est à la fin de votre mois en cours.`,
        cta: "Passer à l'annuel", href: "/app/abonnement?periode=annuel",
      });
    }
  }
  return hints;
}
