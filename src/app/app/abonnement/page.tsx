import { getWorkspace } from "@/lib/workspace";
import { Card, Notice, PageHeader, formatDate } from "@/components/app/ui";
import { pawapayConfigured, OPERATORS } from "@/lib/billing/pawapay";
import { ADDON, EARLY_BIRD, PLANS, TOPUP, PERIOD_LABEL, exitOfferPrice, formatFcfa, isPlan, planPrice, type Period } from "@/lib/billing/plans";
import { earlyBirdFor, isActive, validExitOffer, type Subscription } from "@/lib/billing/subscription";
import { BillingForm } from "./BillingForm";
import { stripeConfigured } from "@/lib/billing/stripe";

const STATUS: Record<string, string> = { pending: "En attente", completed: "Payé", failed: "Échoué" };

function addMonth(iso: string) {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}
function formatDay(d: Date, tz: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: tz }).format(d);
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ paiement?: string; annule?: string }> }) {
  const sp = await searchParams;
  const { supabase, business, role } = await getWorkspace();
  const { data: subRow } = await supabase.from("subscriptions").select("*").eq("business_id", business.id).maybeSingle();
  const sub = (subRow ?? null) as Subscription | null;
  const { data: payments } = await supabase
    .from("payments").select("id, kind, plan, period, amount, addon_minutes, operator, provider, status, failure_reason, created_at")
    .eq("business_id", business.id).order("created_at", { ascending: false }).limit(10);
  const active = isActive(sub);
  const early = await earlyBirdFor(sub);
  const momoOn = pawapayConfigured();
  const cardOn = stripeConfigured();
  const configured = momoOn || cardOn;
  const canPay = role === "owner" || role === "admin";

  const prices = (Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => ({
    id, ...PLANS[id],
    price: { monthly: planPrice(id, "monthly", early.eligible), yearly: planPrice(id, "yearly", early.eligible) },
    exitYearly: exitOfferPrice(id),
  }));
  const offer = active ? null : await validExitOffer(supabase, business.id);

  const includedSec = (sub?.minutes_included ?? 0) * 60;
  const usedSec = sub?.seconds_used ?? 0;
  const leftMin = Math.max(0, Math.floor((includedSec - usedSec) / 60));
  const extraMin = Math.floor((sub?.extra_seconds ?? 0) / 60);
  const pct = includedSec ? Math.min(100, Math.round((usedSec / includedSec) * 100)) : 0;
  const resetAt = sub?.usage_period_start ? formatDay(addMonth(sub.usage_period_start), business.timezone) : null;
  const pendingPayment = payments?.find((p) => p.status === "pending" && p.provider !== "stripe" && Date.now() - new Date(p.created_at).getTime() < 15 * 60 * 1000);

  return (
    <div>
      <PageHeader title="Abonnement" subtitle="Votre offre, vos minutes et le paiement par Mobile Money ou carte." />

      {sub && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gris">Offre actuelle</p>
              <p className="mt-1 text-2xl font-medium">
                {isPlan(sub.plan) ? PLANS[sub.plan].name : sub.plan} · {sub.period === "yearly" ? "annuel" : "mensuel"}
              </p>
              <p className={`mt-1 text-sm ${active ? "text-traite" : "text-red-600"}`}>
                {active ? `Active jusqu'au ${formatDate(sub.paid_until, business.timezone)}` : `Expirée depuis le ${formatDate(sub.paid_until, business.timezone)}`}
              </p>
              {sub.early_bird_until && new Date(sub.early_bird_until) > new Date() && (
                <p className="mt-1 text-sm text-gris">Tarif avant-première (−{EARLY_BIRD.discount * 100} %) jusqu&apos;au {formatDate(sub.early_bird_until, business.timezone)}.</p>
              )}
            </div>
            <div className="min-w-56">
              <p className="text-sm text-gris">Minutes ce mois-ci</p>
              <p className="mt-1 text-2xl font-medium">{Math.ceil(usedSec / 60)} / {sub.minutes_included} min</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-perle">
                <div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : "bg-traite"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-gris">
                {leftMin} min restantes{extraMin > 0 && ` + ${extraMin} min de recharge`}
                {resetAt && ` · remise à zéro le ${resetAt}`}
              </p>
            </div>
          </div>
          {active && pct >= 90 && extraMin === 0 && (
            <div className="mt-4"><Notice tone="error">Vous avez presque épuisé vos minutes. Ajoutez une recharge pour que les appels restent comptés dans votre offre.</Notice></div>
          )}
        </Card>
      )}

      {!configured && (
        <div className="mb-6">
          <Notice>
            Le paiement en ligne (Mobile Money et carte bancaire) est en cours d&apos;activation. En attendant, écrivez-nous sur WhatsApp au{" "}
            <a className="underline" href="https://wa.me/242057949393" target="_blank" rel="noopener">+242 05 794 93 93</a> pour activer votre offre.
          </Notice>
        </div>
      )}
      {!canPay && <div className="mb-6"><Notice>Seul le propriétaire du compte peut payer l&apos;abonnement.</Notice></div>}

      <BillingForm
        plans={prices}
        active={active}
        currentPlan={sub?.plan ?? null}
        currentPeriod={(sub?.period as Period) ?? null}
        early={{ eligible: early.eligible, left: early.left, discount: EARLY_BIRD.discount }}
        topup={{ minutes: TOPUP.minutes, amount: TOPUP.amount }}
        operators={Object.entries(OPERATORS).map(([value, label]) => ({ value, label }))}
        disabled={!canPay}
        methods={{ momo: momoOn, card: cardOn }}
        pendingId={(sp.paiement && /^[0-9a-f-]{36}$/i.test(sp.paiement) ? sp.paiement : null) ?? pendingPayment?.id ?? null}
        cancelled={sp.annule === "1"}
        cardReturn={Boolean(sp.paiement)}
        addon={ADDON}
        offer={offer ? { expiresAt: offer.expires_at, discount: Number(offer.discount) } : null}
      />


      {payments && payments.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-lg font-medium">Historique des paiements</h2>
          <ul className="divide-y divide-ligne text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  {formatDate(p.created_at, business.timezone)} ·{" "}
                  {p.kind === "topup" ? `Recharge ${TOPUP.minutes} min` : `${isPlan(p.plan) ? PLANS[p.plan].name : p.plan} (${PERIOD_LABEL[(p.period as Period) ?? "monthly"]})${p.addon_minutes ? ` + ${p.addon_minutes} min` : ""}`}
                  {" · "}{p.provider === "stripe" ? "Carte bancaire" : OPERATORS[p.operator as keyof typeof OPERATORS] ?? p.operator}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{formatFcfa(p.amount)}</span>
                  <span className={p.status === "completed" ? "text-traite" : p.status === "failed" ? "text-red-600" : "text-gris"} title={p.failure_reason ?? undefined}>
                    {STATUS[p.status] ?? p.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
