"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Notice } from "@/components/app/ui";
import { checkPayment, claimExitOffer, startPayment, type PayState } from "./actions";
import { track, trackOnce } from "@/lib/funnel/track";

type Plan = { id: string; name: string; tag: string; minutes: number; features: string[]; monthly: number; yearly: number; price: { monthly: number; yearly: number }; exitYearly: number };
type Props = {
  plans: Plan[]; active: boolean; currentPlan: string | null; currentPeriod: "monthly" | "yearly" | null;
  early: { eligible: boolean; left: number | null; discount: number }; topup: { minutes: number; amount: number };
  operators: { value: string; label: string }[]; disabled: boolean; pendingId: string | null;
  methods: { momo: boolean; card: boolean }; cancelled: boolean; cardReturn: boolean;
  addon: { minutes: number; amount: number }; offer: { expiresAt: string; discount: number } | null;
};

type Exit = { kind: "early"; left: number | null } | { kind: "exit"; expiresAt: string; discount: number };

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} FCFA`;

export function BillingForm(p: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<"monthly" | "yearly">(p.currentPeriod ?? "yearly");
  const [kind, setKind] = useState<"subscription" | "topup">("subscription");
  const [plan, setPlan] = useState<string>(p.currentPlan ?? "essentiel");
  const [method, setMethod] = useState<"momo" | "card">(!p.methods.momo && p.methods.card ? "card" : "momo");
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

  const [addon, setAddon] = useState(false);
  const [offer, setOffer] = useState(p.offer);
  const [exit, setExit] = useState<Exit | null>(null);
  const leaveTo = useRef<string | null>(null);
  const payRef = useRef<HTMLDivElement>(null);
  const exitArmed = !p.active && !p.disabled && !waitId;

  useEffect(() => { trackOnce("billing_view"); }, []);

  // Offre de sortie : au retour d'un paiement par carte annulé, en quittant la page (lien interne) ou en sortant la souris par le haut.
  const openExit = useCallback(async (to: string | null) => {
    try { if (sessionStorage.getItem("vocaly-exit-shown")) return false; sessionStorage.setItem("vocaly-exit-shown", "1"); } catch {}
    const r = await claimExitOffer().catch(() => ({ kind: "none" as const }));
    if (r.kind === "none") return false;
    leaveTo.current = to;
    if (r.kind === "exit") setOffer({ expiresAt: r.expiresAt, discount: r.discount });
    setExit(r);
    track("exit_offer_shown", { kind: r.kind });
    return true;
  }, []);

  useEffect(() => { if (p.cancelled && exitArmed) void openExit(null); }, [p.cancelled, exitArmed, openExit]);

  useEffect(() => {
    if (!exitArmed) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href || !href.startsWith("/") || href.startsWith("/app/abonnement") || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
      try { if (sessionStorage.getItem("vocaly-exit-shown")) return; } catch {}
      e.preventDefault();
      e.stopPropagation();
      void openExit(href).then((shown) => { if (!shown) router.push(href); });
    };
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0 && !e.relatedTarget) void openExit(null); };
    document.addEventListener("click", onClick, true);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => { document.removeEventListener("click", onClick, true); document.documentElement.removeEventListener("mouseleave", onLeave); };
  }, [exitArmed, openExit, router]);

  const offerOn = Boolean(offer && !p.early.eligible && new Date(offer.expiresAt) > new Date());
  const yearlyOf = (x: Plan) => (offerOn ? x.exitYearly : x.price.yearly);
  const priceOf = (x: Plan, per: "monthly" | "yearly") => (per === "yearly" ? yearlyOf(x) : x.price.monthly);

  function acceptExit(choice: "yearly" | "monthly") {
    track("exit_offer_accepted", { choice });
    setKind("subscription");
    if (choice === "yearly") setPeriod("yearly");
    else { setPeriod("monthly"); setPlan("essentiel"); }
    setExit(null);
    leaveTo.current = null;
    setTimeout(() => payRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function leave() {
    const to = leaveTo.current;
    setExit(null);
    if (to) router.push(to);
  }

  const methodOn = p.methods[method];
  const selected = p.plans.find((x) => x.id === plan) ?? p.plans[0];
  const planAmount = kind === "topup" ? p.topup.amount : priceOf(selected, period);
  const withAddon = kind === "subscription" && addon;
  const amount = planAmount + (withAddon ? p.addon.amount : 0);
  const sameAsCurrent = p.active && p.currentPlan === plan && p.currentPeriod === period;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-surface p-1 text-sm">
          {(["yearly", "monthly"] as const).map((v) => (
            <button key={v} type="button" onClick={() => { setPeriod(v); setKind("subscription"); }}
              className={`rounded-full px-4 py-2 transition-colors ${period === v ? "bg-brand text-sur-brand" : "text-gris hover:text-noir"}`}>
              {v === "monthly" ? "Mensuel" : "Annuel · 2 mois offerts"}
            </button>
          ))}
        </div>
        {p.early.eligible && (
          <span className="rounded-full bg-traite/15 px-3 py-1.5 text-sm font-medium text-traite">
            Avant-première : −{p.early.discount * 100} % la première année{p.early.left != null && ` · ${p.early.left} places restantes`}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {p.plans.map((x) => {
          const isSel = kind === "subscription" && plan === x.id;
          const full = x[period];
          const price = priceOf(x, period);
          return (
            <button key={x.id} type="button" onClick={() => { setPlan(x.id); setKind("subscription"); }}
              className={`lift rounded-3xl border-2 bg-surface p-6 text-left transition-colors ${isSel ? "border-noir" : "border-transparent"}`}>
              <span className={`mb-3 inline-block rounded-lg px-2.5 py-1 text-xs font-semibold ${x.id === "pro" ? "bg-brand text-sur-brand" : "bg-perle text-noir"}`}>{x.tag}</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{x.name}</span>
                {p.active && p.currentPlan === x.id && <span className="rounded-full bg-perle px-2.5 py-1 text-xs">Votre offre</span>}
              </div>
              {period === "yearly" ? (
                <>
                  <p className="mt-3 text-3xl font-medium">{fcfa(Math.round(price / 12))}<span className="text-base text-gris"> / mois</span></p>
                  <p className="text-sm text-gris">Facturé {fcfa(price)} par an{price !== full && <> au lieu de <span className="line-through">{fcfa(full)}</span></>}</p>
                  <p className="text-sm font-medium text-traite">2 mois offerts{offerOn && ` + −${Math.round((offer?.discount ?? 0) * 100)} % jusqu'au ${until(offer!.expiresAt)}`}</p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-3xl font-medium">{fcfa(price)}<span className="text-base text-gris"> / mois</span></p>
                  {price !== full && <p className="text-sm text-gris line-through">{fcfa(full)}</p>}
                  <p className="text-sm text-gris">En annuel : {fcfa(Math.round(yearlyOf(x) / 12))} par mois</p>
                </>
              )}
              <ul className="mt-4 space-y-1.5 text-sm">
                {x.features.map((f) => <li key={f} className="flex gap-2"><span className="text-traite">✓</span>{f}</li>)}
              </ul>
            </button>
          );
        })}
        <div className="flex flex-col rounded-3xl border-2 border-transparent bg-surface p-6">
          <span className="mb-3 inline-block self-start rounded-lg border border-ligne px-2.5 py-1 text-xs font-semibold">Plusieurs lignes, gros volumes</span>
          <span className="text-lg font-semibold">Business+</span>
          <p className="mt-3 text-3xl font-medium">Sur devis</p>
          <p className="text-sm text-gris">Plusieurs agents, plusieurs numéros, gros volumes d&apos;appels.</p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {["Minutes adaptées à votre volume", "Plusieurs agents et numéros +242", "Mise en place complète avec notre équipe", "Suivi dédié"].map((f) => (
              <li key={f} className="flex gap-2"><span className="text-traite">✓</span>{f}</li>
            ))}
          </ul>
          <a href="https://wa.me/242057949393?text=Bonjour%2C%20je%20souhaite%20un%20devis%20Vocaly%20Business%2B" target="_blank" rel="noopener"
            className="mt-6 inline-block rounded-full border border-ligne px-5 py-2.5 text-center text-sm font-medium transition-colors hover:bg-perle md:mt-auto">
            Contactez-nous
          </a>
        </div>
      </div>

      {p.active && (
        <button type="button" onClick={() => setKind("topup")}
          className={`lift w-full rounded-3xl border-2 bg-surface p-5 text-left ${kind === "topup" ? "border-noir" : "border-transparent"}`}>
          <span className="font-semibold">Recharge de {p.topup.minutes} minutes</span>
          <span className="ml-2 text-gris">{fcfa(p.topup.amount)} · sans date d&apos;expiration, utilisée après les minutes de votre offre</span>
        </button>
      )}

      <div ref={payRef} className="scroll-mt-24" />
      <Card>
        <div className="mb-4 inline-flex rounded-full bg-perle p-1 text-sm">
          {([["momo", "Mobile Money"], ["card", "Carte bancaire"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setMethod(v)}
              className={`rounded-full px-4 py-2 transition-colors ${method === v ? "bg-brand text-sur-brand" : "text-gris hover:text-noir"}`}>
              {label}
            </button>
          ))}
        </div>
        <h2 className="mb-1 text-lg font-medium">{method === "momo" ? "Payer par Mobile Money" : "Payer par carte bancaire"}</h2>
        <p className="mb-5 text-sm text-gris">
          {kind === "topup" ? `Recharge de ${p.topup.minutes} minutes` : `${selected.name}, ${period === "monthly" ? "1 mois" : "1 an"}`} :{" "}
          <b className="text-noir">{fcfa(planAmount)}</b>{withAddon && <> + {p.addon.minutes} minutes à <b className="text-noir">{fcfa(p.addon.amount)}</b></>}.{" "}
          {kind === "subscription" && (sameAsCurrent ? "La nouvelle période s'ajoute à la fin de la période en cours." : p.active ? "Changement d'offre : la nouvelle période démarre dès le paiement." : "Votre offre démarre dès la confirmation du paiement.")}
        </p>
        <form action={action} className="space-y-4">
          <input type="hidden" name="kind" value={kind} />
          {kind === "subscription" && <><input type="hidden" name="plan" value={plan} /><input type="hidden" name="period" value={period} /></>}
          <input type="hidden" name="method" value={method} />
          {kind === "subscription" && (
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${addon ? "border-noir bg-perle" : "border-ligne"}`}>
              <input type="checkbox" name="addon" value="1" checked={addon} className="mt-1 h-4 w-4 accent-[var(--color-brand)]"
                onChange={(e) => { setAddon(e.target.checked); if (e.target.checked) track("addon_checked"); }} />
              <span className="text-sm">
                <b>Ajouter {p.addon.minutes} minutes pour {fcfa(p.addon.amount)}</b>{" "}
                <span className="text-gris">au lieu de {fcfa(p.topup.amount)} en recharge plus tard. Sans date d&apos;expiration, utilisées après les minutes de votre offre.</span>
              </span>
            </label>
          )}
          {method === "momo" ? (
            <>
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
            </>
          ) : (
            <p className="text-sm text-gris">Visa ou Mastercard. Vous êtes redirigé vers la page de paiement sécurisée de Stripe, puis vous revenez ici.</p>
          )}
          <Button type="submit" disabled={p.disabled || !methodOn || pending || Boolean(waitId)}>
            {pending ? "Envoi…" : waitId ? "En attente de confirmation…" : method === "card" ? `Payer ${fcfa(amount)} par carte` : `Payer ${fcfa(amount)}`}
          </Button>
          {!methodOn && <Notice>Ce moyen de paiement est en cours d&apos;activation.</Notice>}
          {p.cancelled && !waitId && !state.message && <Notice>Paiement par carte annulé. Aucun montant n&apos;a été débité.</Notice>}
          {state.message && !result && <Notice tone={state.ok ? "info" : "error"}>{state.message}</Notice>}
          {waitId && (
            <Notice>
              <span className="pulse-dot mr-2 inline-block h-2 w-2 rounded-full bg-traite" />
              {state.paymentId || !p.cardReturn ? "Demande envoyée. Composez votre code secret sur le téléphone pour valider." : "Nous vérifions votre paiement par carte."} Cette page se met à jour toute seule.
            </Notice>
          )}
          {result?.status === "completed" && <Notice tone="ok">Paiement confirmé. Votre offre est active.</Notice>}
          {result?.status === "failed" && <Notice tone="error">Paiement non abouti{result.reason ? ` : ${result.reason}` : ""}. Vous pouvez réessayer.</Notice>}
          {result?.status === "pending" && <Notice>Pas encore de confirmation de l&apos;opérateur. Rechargez la page dans quelques minutes : le paiement sera pris en compte dès sa confirmation.</Notice>}
        </form>
      </Card>

      {exit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" onClick={leave}>
          <div className="pop-in w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {exit.kind === "exit" ? (
              <>
                <span className="inline-block rounded-lg bg-traite/15 px-2.5 py-1 text-xs font-semibold text-traite">Offre valable jusqu&apos;au {until(exit.expiresAt)}</span>
                <h2 className="mt-3 text-2xl font-semibold">−{Math.round(exit.discount * 100)} % de plus sur l&apos;annuel</h2>
                <p className="mt-2 text-sm text-gris">En plus des 2 mois offerts. Une seule fois, réservée à votre entreprise.</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.plans.map((x) => (
                    <li key={x.id} className="flex items-center justify-between rounded-2xl bg-perle px-4 py-3">
                      <span className="font-medium">{x.name}</span>
                      <span><span className="mr-2 text-gris line-through">{fcfa(x.yearly)}</span><b>{fcfa(x.exitYearly)}</b> / an</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <span className="inline-block rounded-lg bg-traite/15 px-2.5 py-1 text-xs font-semibold text-traite">Avant-première</span>
                <h2 className="mt-3 text-2xl font-semibold">−{p.early.discount * 100} % la première année</h2>
                <p className="mt-2 text-sm text-gris">
                  {exit.left != null ? `Il reste ${exit.left} place${exit.left > 1 ? "s" : ""} sur 10. ` : ""}La réduction est réservée aux premières entreprises inscrites et s&apos;arrête dès que les places sont prises.
                </p>
              </>
            )}
            <div className="mt-6 grid gap-2">
              <Button type="button" onClick={() => acceptExit("yearly")}>Profiter de l&apos;offre en annuel</Button>
              <button type="button" onClick={() => acceptExit("monthly")} className="rounded-full border border-ligne px-5 py-2.5 text-sm font-medium transition-colors hover:bg-perle">
                Commencer en mensuel avec Essentiel ({fcfa(p.plans.find((x) => x.id === "essentiel")?.price.monthly ?? 0)})
              </button>
              <button type="button" onClick={leave} className="py-2 text-sm text-gris hover:text-noir">Plus tard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function until(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Brazzaville" }).format(new Date(iso));
}
