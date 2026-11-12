"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Notice } from "@/components/app/ui";
import { checkPayment, startPayment, type PayState } from "./actions";

type Plan = { id: string; name: string; minutes: number; features: string[]; monthly: number; yearly: number; price: { monthly: number; yearly: number } };
type Props = {
  plans: Plan[]; active: boolean; currentPlan: string | null; currentPeriod: "monthly" | "yearly" | null;
  early: { eligible: boolean; left: number | null; discount: number }; topup: { minutes: number; amount: number };
  operators: { value: string; label: string }[]; disabled: boolean; pendingId: string | null;
};

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} FCFA`;

export function BillingForm(p: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<"monthly" | "yearly">(p.currentPeriod ?? "monthly");
  const [kind, setKind] = useState<"subscription" | "topup">("subscription");
  const [plan, setPlan] = useState<string>(p.currentPlan ?? "essentiel");
  const [operator, setOperator] = useState(p.operators[0]?.value ?? "MTN_MOMO_COG");
  const [state, action, pending] = useActionState<PayState, FormData>(startPayment, {});
  const [waitId, setWaitId] = useState<string | null>(p.pendingId);
  const [result, setResult] = useState<{ status: string; reason?: string | null } | null>(null);

  useEffect(() => { if (state.paymentId) { setWaitId(state.paymentId); setResult(null); } }, [state.paymentId]);

  // Pendant l'attente, on interroge le serveur toutes les 4 s (le serveur vérifie chez PawaPay).
  useEffect(() => {
    if (!waitId) return;
    let stop = false;
    let tries = 0;
    const tick = async () => {
      if (stop) return;
      tries++;
      const r = await checkPayment(waitId).catch(() => ({ status: "pending" as string, reason: null }));
      if (stop) return;
      if (r.status === "pending" && tries < 60) { setTimeout(tick, 4000); return; }
      setResult({ status: r.status, reason: "reason" in r ? r.reason : null });
      setWaitId(null);
      router.refresh();
    };
    const t = setTimeout(tick, 3000);
    return () => { stop = true; clearTimeout(t); };
  }, [waitId, router]);

  const selected = p.plans.find((x) => x.id === plan) ?? p.plans[0];
  const amount = kind === "topup" ? p.topup.amount : selected.price[period];
  const sameAsCurrent = p.active && p.currentPlan === plan && p.currentPeriod === period;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-surface p-1 text-sm">
          {(["monthly", "yearly"] as const).map((v) => (
            <button key={v} type="button" onClick={() => { setPeriod(v); setKind("subscription"); }}
              className={`rounded-full px-4 py-2 transition-colors ${period === v ? "bg-brand text-sur-brand" : "text-gris hover:text-noir"}`}>
              {v === "monthly" ? "Mensuel" : "Annuel · −17 %"}
            </button>
          ))}
        </div>
        {p.early.eligible && (
          <span className="rounded-full bg-traite/15 px-3 py-1.5 text-sm font-medium text-traite">
            Avant-première : −{p.early.discount * 100} % la première année{p.early.left != null && ` · ${p.early.left} places restantes`}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {p.plans.map((x) => {
          const isSel = kind === "subscription" && plan === x.id;
          const full = x[period];
          const price = x.price[period];
          return (
            <button key={x.id} type="button" onClick={() => { setPlan(x.id); setKind("subscription"); }}
              className={`lift rounded-3xl border-2 bg-surface p-6 text-left transition-colors ${isSel ? "border-noir" : "border-transparent"}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{x.name}</span>
                {p.active && p.currentPlan === x.id && <span className="rounded-full bg-perle px-2.5 py-1 text-xs">Votre offre</span>}
              </div>
              <p className="mt-3 text-3xl font-medium">{fcfa(price)}<span className="text-base text-gris"> / {period === "monthly" ? "mois" : "an"}</span></p>
              {price !== full && <p className="text-sm text-gris line-through">{fcfa(full)}</p>}
              {period === "yearly" && <p className="text-sm text-gris">soit {fcfa(Math.round(price / 12))} par mois</p>}
              <ul className="mt-4 space-y-1.5 text-sm">
                {x.features.map((f) => <li key={f} className="flex gap-2"><span className="text-traite">✓</span>{f}</li>)}
              </ul>
            </button>
          );
        })}
      </div>

      {p.active && (
        <button type="button" onClick={() => setKind("topup")}
          className={`lift w-full rounded-3xl border-2 bg-surface p-5 text-left ${kind === "topup" ? "border-noir" : "border-transparent"}`}>
          <span className="font-semibold">Recharge de {p.topup.minutes} minutes</span>
          <span className="ml-2 text-gris">{fcfa(p.topup.amount)} · sans date d&apos;expiration, utilisée après les minutes de votre offre</span>
        </button>
      )}

      <Card>
        <h2 className="mb-1 text-lg font-medium">Payer par Mobile Money</h2>
        <p className="mb-5 text-sm text-gris">
          {kind === "topup" ? `Recharge de ${p.topup.minutes} minutes` : `${selected.name}, ${period === "monthly" ? "1 mois" : "1 an"}`} :{" "}
          <b className="text-noir">{fcfa(amount)}</b>.{" "}
          {kind === "subscription" && (sameAsCurrent ? "La nouvelle période s'ajoute à la fin de la période en cours." : p.active ? "Changement d'offre : la nouvelle période démarre dès le paiement." : "Votre offre démarre dès la confirmation du paiement.")}
        </p>
        <form action={action} className="space-y-4">
          <input type="hidden" name="kind" value={kind} />
          {kind === "subscription" && <><input type="hidden" name="plan" value={plan} /><input type="hidden" name="period" value={period} /></>}
          <div className="grid gap-2 sm:grid-cols-2">
            {p.operators.map((o) => (
              <label key={o.value} className={`cursor-pointer rounded-2xl border p-4 ${operator === o.value ? "border-noir" : "border-ligne"}`}>
                <input type="radio" name="operator" value={o.value} checked={operator === o.value} onChange={() => setOperator(o.value)} className="sr-only" />
                <span className="font-semibold">{o.label}</span>
              </label>
            ))}
          </div>
          <Field label="Numéro Mobile Money" hint="Le numéro qui va payer. Vous recevrez une demande de validation sur ce téléphone.">
            <input name="phone" inputMode="tel" required className="input" placeholder={operator === "MTN_MOMO_COG" ? "06 123 45 67" : "05 123 45 67"} />
          </Field>
          <Button type="submit" disabled={p.disabled || pending || Boolean(waitId)}>
            {pending ? "Envoi…" : waitId ? "En attente de validation…" : `Payer ${fcfa(amount)}`}
          </Button>
          {state.message && !result && <Notice tone={state.ok ? "info" : "error"}>{state.message}</Notice>}
          {waitId && (
            <Notice>
              <span className="pulse-dot mr-2 inline-block h-2 w-2 rounded-full bg-traite" />
              Demande envoyée. Composez votre code secret sur le téléphone pour valider. Cette page se met à jour toute seule.
            </Notice>
          )}
          {result?.status === "completed" && <Notice tone="ok">Paiement confirmé par l&apos;opérateur. Votre offre est active.</Notice>}
          {result?.status === "failed" && <Notice tone="error">Paiement non abouti{result.reason ? ` : ${result.reason}` : ""}. Vous pouvez réessayer.</Notice>}
          {result?.status === "pending" && <Notice>Pas encore de confirmation de l&apos;opérateur. Rechargez la page dans quelques minutes : le paiement sera pris en compte dès sa confirmation.</Notice>}
        </form>
      </Card>
    </div>
  );
}
