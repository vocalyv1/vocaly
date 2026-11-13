import "server-only";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import { emailConfigured } from "@/lib/calls/email";
import { TOPUP, formatFcfa, PLANS, isPlan } from "@/lib/billing/plans";
import { dayLabel } from "@/lib/billing/insights";
import { sendMail } from "./mail";

type Db = ReturnType<typeof createAdminClient>;
type Biz = { id: string; name: string; email: string | null; timezone: string };

// Réserve l'envoi (contrainte unique) avant d'envoyer : un même e-mail ne part jamais deux fois.
async function once(db: Db, businessId: string, kind: string, ref: string, send: () => Promise<void>) {
  const { error } = await db.from("notifications_sent").insert({ business_id: businessId, kind, ref });
  if (error) return false; // déjà envoyé (ou table absente)
  try {
    await send();
    return true;
  } catch (e) {
    await db.from("notifications_sent").delete().eq("business_id", businessId).eq("kind", kind).eq("ref", ref);
    await logError("notify", `Envoi ${kind} impossible`, { error: String(e) }, businessId);
    return false;
  }
}

// Tâche quotidienne : rappels de renouvellement, alertes de minutes, récapitulatif du lundi.
export async function runDaily(site: string) {
  const report = { renewals: 0, usage: 0, weekly: 0, skipped: "" };
  if (!emailConfigured()) { report.skipped = "E-mail non configuré (RESEND_API_KEY / RESEND_FROM)"; return report; }
  const db = createAdminClient();
  const { data: subs } = await db.from("subscriptions").select("*");
  const { data: bizRows } = await db.from("businesses").select("id, name, email, timezone");
  const biz = new Map((bizRows ?? []).map((b) => [b.id, b as Biz]));
  const now = Date.now();

  for (const s of subs ?? []) {
    const b = biz.get(s.business_id);
    if (!b?.email || !s.paid_until) continue;
    const tz = b.timezone || "Africa/Brazzaville";
    const left = Math.ceil((new Date(s.paid_until).getTime() - now) / 864e5);
    const end = dayLabel(s.paid_until, tz);
    const planId = String(s.plan);
    const plan = isPlan(planId) ? PLANS[planId].name : planId;
    const renewUrl = `${site}/app/abonnement`;

    // Renouvellement : 7 jours, 3 jours, la veille ou le jour même, puis le lendemain de l'expiration.
    const step = left <= -1 && left >= -2 ? "expired" : left <= 1 && left >= 0 ? "0" : left === 3 ? "3" : left === 7 ? "7" : null;
    if (step) {
      const sent = await once(db, b.id, `renewal_${step}`, s.paid_until, () =>
        sendMail(b.email!, step === "expired" ? `Votre offre Vocaly a expiré` : `Votre offre Vocaly se termine le ${end}`, {
          title: step === "expired" ? "Votre offre a expiré" : `Votre offre se termine le ${end}`,
          lines: step === "expired"
            ? [`L'offre ${plan} de ${b.name} a expiré le ${end}.`, "Renouvelez-la pour continuer à utiliser votre agent."]
            : [`L'offre ${plan} de ${b.name} se termine le ${end}.`, "Le renouvellement n'est pas automatique : payez par Mobile Money ou par carte, la nouvelle période s'ajoute à la fin de la période en cours."],
          cta: { label: "Renouveler mon offre", url: renewUrl },
        }));
      if (sent) report.renewals++;
    }

    // Minutes : 80 % puis 100 % de l'offre du mois, sans recharge disponible.
    if (s.status === "active" && new Date(s.paid_until).getTime() > now && s.minutes_included && (s.extra_seconds ?? 0) === 0) {
      const pct = Math.round(((s.seconds_used ?? 0) / (s.minutes_included * 60)) * 100);
      const level = pct >= 100 ? "100" : pct >= 80 ? "80" : null;
      if (level) {
        const sent = await once(db, b.id, `usage_${level}`, s.usage_period_start ?? s.paid_until, () =>
          sendMail(b.email!, level === "100" ? "Vous avez utilisé toutes vos minutes" : `Vous avez utilisé ${pct} % de vos minutes`, {
            title: level === "100" ? "Toutes les minutes du mois sont utilisées" : `${pct} % de vos minutes sont utilisées`,
            lines: [
              `${b.name} a utilisé ${Math.ceil((s.seconds_used ?? 0) / 60)} des ${s.minutes_included} minutes de son offre ce mois-ci.`,
              `Une recharge de ${TOPUP.minutes} minutes coûte ${formatFcfa(TOPUP.amount)}, sans date d'expiration.`,
            ],
            cta: { label: "Ajouter des minutes", url: `${site}/app/abonnement?recharge=1` },
          }));
        if (sent) report.usage++;
      }
    }
  }

  // Récapitulatif du lundi (heure de Brazzaville), pour chaque entreprise qui a reçu des appels réels.
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Brazzaville", weekday: "short" }).format(new Date());
  if (weekday === "Mon") {
    const since = new Date(now - 7 * 864e5).toISOString();
    const { data: calls } = await db.from("calls").select("business_id, status, is_lead, has_appointment_request, duration_seconds, follow_up_done_at, next_action")
      .eq("channel", "phone").gte("created_at", since).limit(50000);
    const byBiz = new Map<string, NonNullable<typeof calls>>();
    for (const c of calls ?? []) byBiz.set(c.business_id, [...(byBiz.get(c.business_id) ?? []), c]);
    const week = new Date().toISOString().slice(0, 10);
    for (const [id, list] of byBiz) {
      const b = biz.get(id);
      if (!b?.email || !list.length) continue;
      const rdv = list.filter((c) => c.has_appointment_request).length;
      const leads = list.filter((c) => c.is_lead).length;
      const todo = list.filter((c) => c.status !== "resolved" && !c.follow_up_done_at && c.next_action && c.next_action !== "Aucune").length;
      const min = Math.round(list.reduce((a, c) => a + (c.duration_seconds ?? 0), 0) / 60);
      const sent = await once(db, id, "weekly", week, () =>
        sendMail(b.email!, `Votre semaine avec Vocaly : ${list.length} appel${list.length > 1 ? "s" : ""}`, {
          title: `${b.name} : votre semaine`,
          lines: [
            `Ces 7 derniers jours, votre agent a décroché ${list.length} appel${list.length > 1 ? "s" : ""} (${min} minute${min > 1 ? "s" : ""} au téléphone).`,
            `${rdv} demande${rdv > 1 ? "s" : ""} de rendez-vous, ${leads} prospect${leads > 1 ? "s" : ""}.`,
            todo ? `${todo} appel${todo > 1 ? "s" : ""} attend${todo > 1 ? "ent" : ""} encore une action de votre part.` : "Aucun appel n'attend d'action de votre part.",
          ],
          cta: { label: todo ? "Voir les appels à rappeler" : "Voir mes appels", url: `${site}/app/appels${todo ? "?vue=a-rappeler" : ""}` },
        }));
      if (sent) report.weekly++;
    }
  }
  return report;
}
