"use client";

import Link from "next/link";
import { useEffect } from "react";
import { track, trackOnce } from "@/lib/funnel/track";

// Juste après le test : l'agent est prêt, il ne manque que l'abonnement pour qu'il réponde aux vrais appels.
export function ActivatePanel(p: { agentName: string; testCalls: number; fromPrice: string; early: { left: number | null; discount: number } | null }) {
  useEffect(() => { trackOnce("paywall_view", { testCalls: p.testCalls }); }, [p.testCalls]);
  return (
    <div className="mb-6 overflow-hidden rounded-3xl bg-brand p-6 text-sur-brand md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <p className="text-sm opacity-70">{p.testCalls > 0 ? `${p.testCalls} appel${p.testCalls > 1 ? "s" : ""} de test avec ${p.agentName}` : `${p.agentName} est prêt`}</p>
          <h2 className="mt-1 text-2xl font-semibold">Mettez {p.agentName} au travail sur votre numéro</h2>
          <p className="mt-2 text-sm opacity-80">
            Choisissez votre offre : nous préparons ensuite votre numéro +242 et {p.agentName} répond à vos clients, jour et nuit.
            Dès {p.fromPrice} par mois en annuel.
            {p.early && ` Avant-première : −${p.early.discount * 100} % la première année${p.early.left != null ? `, ${p.early.left} place${p.early.left > 1 ? "s" : ""} restante${p.early.left > 1 ? "s" : ""}` : ""}.`}
          </p>
        </div>
        <Link href="/app/abonnement" onClick={() => track("paywall_click", { testCalls: p.testCalls })}
          className="rounded-full bg-sur-brand px-6 py-3 font-semibold text-brand transition-transform hover:scale-[1.03]">
          Activer {p.agentName}
        </Link>
      </div>
    </div>
  );
}
