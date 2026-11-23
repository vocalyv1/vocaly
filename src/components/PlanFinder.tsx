"use client";

import { useState } from "react";
import Link from "next/link";

// Tarifs « par le besoin » : deux questions, un forfait recommandé, puis la liste courte des forfaits
// qui ne montre que ce qui change de l'un à l'autre. Ce qui est commun à tous est dit une seule fois.

export type FinderPlan = {
  id: "starter" | "essentiel" | "pro" | "business";
  name: string;
  forWho: string;
  minutes: number | null; // null = sur devis
  monthly: number | null;
  yearly: number | null;
  early: number | null; // prix mensuel avant-première, seulement si l'offre y a droit et qu'il reste des places
  transfer: boolean;
  extra?: string;
};

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n)).replace(/ | /g, " ")} FCFA`;

// Durée moyenne retenue pour estimer le nombre d'appels : 2 minutes.
const VOLUMES = [
  { label: "Moins de 20 appels", why: "moins de 20 appels par mois" },
  { label: "20 à 50 appels", why: "20 à 50 appels par mois" },
  { label: "50 à 150 appels", why: "50 à 150 appels par mois" },
  { label: "Plus de 150 appels", why: "plus de 150 appels par mois" },
];

function recommend(volume: number, human: boolean): FinderPlan["id"] {
  if (volume === 0) return human ? "essentiel" : "starter";
  if (volume === 1) return "essentiel";
  if (volume === 2) return "pro";
  return "business";
}

export function PlanFinder({ plans, seatsText, whatsapp }: { plans: FinderPlan[]; seatsText: string | null; whatsapp: string }) {
  const [volume, setVolume] = useState(1);
  const [human, setHuman] = useState(false);
  const [picked, setPicked] = useState<FinderPlan["id"] | null>(null);

  const recId = recommend(volume, human);
  const shownId = picked ?? recId;
  const plan = plans.find((p) => p.id === shownId)!;
  const isRec = shownId === recId;

  const why =
    plan.minutes != null
      ? `Vous recevez ${VOLUMES[volume].why}${human ? " et vous voulez pouvoir passer la main" : ""}. ${plan.name} inclut ${plan.minutes} minutes, soit environ ${Math.round(plan.minutes / 2)} appels de 2 minutes${plan.transfer ? ", avec transfert vers un humain" : ""}.`
      : `Vous recevez ${VOLUMES[volume].why}. Nous calculons les minutes avec vous, pour un ou plusieurs numéros.`;

  return (
    <div className="finder">
      <div className="finder-grid">
        <div className="finder-q">
          <label className="finder-field">
            <span>Combien d’appels recevez-vous par mois&nbsp;?</span>
            <b>{VOLUMES[volume].label}</b>
            <input type="range" min={0} max={3} step={1} value={volume} aria-valuetext={VOLUMES[volume].label}
              onChange={(e) => { setVolume(Number(e.target.value)); setPicked(null); }} />
            <span className="finder-scale" aria-hidden="true"><i>&lt; 20</i><i>20 – 50</i><i>50 – 150</i><i>150 +</i></span>
          </label>
          <div className="finder-field" role="group" aria-labelledby="finder-human">
            <span id="finder-human">L’agent doit-il pouvoir passer l’appel à quelqu’un de votre équipe&nbsp;?</span>
            <div className="finder-seg">
              <button type="button" aria-pressed={!human} onClick={() => { setHuman(false); setPicked(null); }}>Non, il prend un message</button>
              <button type="button" aria-pressed={human} onClick={() => { setHuman(true); setPicked(null); }}>Oui, si besoin</button>
            </div>
          </div>
          <p className="finder-hint">Pas sûr de votre volume&nbsp;? Commencez petit&nbsp;: vous changez de forfait quand vous voulez, et les minutes en plus s’achètent à la demande.</p>
        </div>

        <div className={`finder-rec${isRec ? " is-rec" : ""}`} aria-live="polite">
          <span className="finder-badge">{isRec ? "Recommandé pour vous" : "Forfait choisi"}</span>
          <span className="finder-name">{plan.name}</span>
          <p className="finder-for">{plan.forWho}</p>
          {plan.monthly != null ? (
            <>
              <p className="finder-price">{fcfa(plan.monthly)}<span> / mois</span></p>
              <p className="finder-sub">Sans engagement. Ou {fcfa(plan.yearly!)} par an, 2 mois offerts.</p>
              {plan.early != null && <p className="finder-early">Avant-première : {fcfa(plan.early)} / mois la première année{seatsText ? ` (${seatsText})` : ""}</p>}
            </>
          ) : (
            <p className="finder-price">Sur devis</p>
          )}
          <p className="finder-why">{why}</p>
          {plan.monthly != null ? (
            <Link className="btn btn-primary" href="/onboarding">Créer mon agent, essai gratuit</Link>
          ) : (
            <a className="btn btn-primary" href={whatsapp} target="_blank" rel="noopener">Demander un devis sur WhatsApp</a>
          )}
          {!isRec && <button type="button" className="finder-back" onClick={() => setPicked(null)}>Revenir à la recommandation</button>}
        </div>
      </div>

      <div className="finder-all">
        <p className="finder-all-title">Les 4 forfaits, en une ligne chacun</p>
        <div className="finder-list">
          {plans.map((p) => (
            <button key={p.id} type="button" className={`finder-item${p.id === shownId ? " on" : ""}${p.id === recId ? " rec" : ""}`}
              aria-pressed={p.id === shownId} onClick={() => setPicked(p.id === recId ? null : p.id)}>
              <span className="finder-item-name">{p.name}{p.id === recId && <em>Recommandé</em>}</span>
              <span className="finder-item-price">{p.monthly != null ? <>{fcfa(p.monthly)}<small> / mois</small></> : "Sur devis"}</span>
              <span className="finder-item-diff">
                {p.minutes != null ? `${p.minutes} min · ${p.transfer ? "transfert vers un humain" : "sans transfert"}` : "Minutes à votre volume"}
                {p.extra ? ` · ${p.extra}` : ""}
              </span>
            </button>
          ))}
        </div>
        <p className="finder-common"><b>Inclus dans tous les forfaits&nbsp;:</b> l’agent répond sur votre numéro actuel, 24&nbsp;h/24, en français, et vous recevez le résumé de chaque appel par e-mail et dans Rapports. Paiement MTN Mobile Money, Airtel Money ou carte bancaire.</p>
      </div>
    </div>
  );
}
