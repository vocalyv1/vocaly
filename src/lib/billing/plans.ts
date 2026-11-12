// Offres Vocaly. Hypothèses de coût (pire cas, toutes les minutes consommées) :
// ~80 FCFA/min (ElevenLabs 0,08 $ + IA + transport) + ~60 FCFA/min opérateur +242 + ~15 000 FCFA/mois par numéro,
// puis 4 % de frais Mobile Money sur chaque paiement. Marge visée : 30 % minimum dans ce pire cas. Les montants sont en FCFA (XAF), sans décimales.
// Les minutes incluses se remettent à zéro chaque mois, y compris en paiement annuel.
// Les minutes sont enregistrées avec chaque paiement : changer une offre ici n'affecte pas les paiements passés.

export type PlanId = "essentiel" | "pro";
export type Period = "monthly" | "yearly";

export const PLANS: Record<PlanId, { name: string; minutes: number; monthly: number; yearly: number; features: string[] }> = {
  essentiel: {
    name: "Essentiel",
    minutes: 60,
    monthly: 35_000,
    yearly: 350_000,
    features: ["60 minutes d'appels par mois", "1 agent, 1 numéro +242", "Résumé de chaque appel par e-mail et dans Rapports", "Transfert vers un humain"],
  },
  pro: {
    name: "Pro",
    minutes: 200,
    monthly: 89_000,
    yearly: 890_000,
    features: ["200 minutes d'appels par mois", "1 agent, 1 numéro +242", "Résumé de chaque appel par e-mail et dans Rapports", "Transfert vers un humain", "Support prioritaire sur WhatsApp"],
  },
};

// Recharge : 50 minutes supplémentaires, sans date d'expiration.
export const TOPUP = { minutes: 50, amount: 25_000 };

// Avant-première : −15 % pendant la première année pour les premières entreprises.
export const EARLY_BIRD = { discount: 0.15, slots: 10 };

export const PERIOD_LABEL: Record<Period, string> = { monthly: "mois", yearly: "an" };

export function planPrice(plan: PlanId, period: Period, earlyBird: boolean) {
  const base = PLANS[plan][period];
  // Arrondi à la centaine de francs inférieure.
  return earlyBird ? Math.floor((base * (1 - EARLY_BIRD.discount)) / 100) * 100 : base;
}

export function formatFcfa(n: number) {
  return `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} FCFA`;
}

export function isPlan(v: unknown): v is PlanId {
  return v === "essentiel" || v === "pro";
}
