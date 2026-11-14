"use client";

import { useState } from "react";

const fcfa = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n)).replace(/ | /g, " ")} FCFA`;

// Calculateur : le visiteur entre SES chiffres. Les valeurs de départ sont des exemples à modifier, pas des statistiques.
export function LossCalculator({ planMonthly }: { planMonthly: number }) {
  const [missed, setMissed] = useState(3);
  const [share, setShare] = useState(30);
  const [value, setValue] = useState(25000);
  const days = 26;
  const lost = missed * days * (share / 100) * value;
  return (
    <div className="calc">
      <div className="calc-inputs">
        <label>
          <span>Appels manqués par jour</span>
          <b>{missed}</b>
          <input type="range" min={1} max={30} value={missed} onChange={(e) => setMissed(Number(e.target.value))} />
        </label>
        <label>
          <span>Sur 10 appels manqués, combien auraient pu devenir des clients ?</span>
          <b>{share / 10}</b>
          <input type="range" min={10} max={100} step={10} value={share} onChange={(e) => setShare(Number(e.target.value))} />
        </label>
        <label>
          <span>Ce que vous rapporte un client, en moyenne (FCFA)</span>
          <input className="calc-num" type="number" inputMode="numeric" min={0} step={1000} value={value} onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))} />
        </label>
      </div>
      <div className="calc-out">
        <span className="eyebrow">Ce que les appels manqués vous coûtent</span>
        <p className="calc-big">{fcfa(lost)}<span> / mois</span></p>
        <p>Calculé avec vos chiffres, sur {days} jours ouvrés. L&apos;offre Essentiel coûte {fcfa(planMonthly)} par mois.</p>
        {value > 0 && lost > planMonthly && (
          <p className="calc-ok">
            {Math.ceil(planMonthly / value) === 1
              ? "Un seul client récupéré par mois suffit à la rembourser."
              : `${Math.ceil(planMonthly / value)} clients récupérés par mois suffisent à la rembourser.`}
          </p>
        )}
      </div>
    </div>
  );
}
