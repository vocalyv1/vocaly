// Offres Vocaly. Hypothèses de coût (pire cas, toutes les minutes consommées) :
// ~80 FCFA/min (ElevenLabs 0,08 $ + IA + transport) + ~60 FCFA/min opérateur +242 + ~15 000 FCFA/mois par numéro,
// puis 4 % de frais Mobile Money sur chaque paiement. Marge dans ce pire cas : ~40 % en annuel, ~23 % en annuel avant-première. Les montants sont en FCFA (XAF), sans décimales.
// Les minutes incluses se remettent à zéro chaque mois, y compris en paiement annuel.
// Les minutes sont enregistrées avec chaque paiement : changer une offre ici n'affecte pas les paiements passés.

export type PlanId = "essentiel" | "pro";
export type Period = "monthly" | "yearly";

export const PLANS: Record<PlanId, { name: string; tag: string; minutes: number; monthly: number; yearly: number; features: string[] }> = {
  essentiel: {
    name: "Essentiel",
    tag: "Environ 50 appels par mois",
    minutes: 100,
    monthly: 59_000,
    yearly: 590_000,
    features: ["100 minutes d'appels par mois", "1 agent, 1 numéro +242", "Résumé de chaque appel par e-mail et dans Rapports", "Transfert vers un humain"],
  },
  pro: {
    name: "Pro",
    tag: "Environ 150 appels par mois",
    minutes: 300,
    monthly: 129_000,
    yearly: 1_290_000,
    features: ["300 minutes d'appels par mois", "1 agent, 1 numéro +242", "Résumé de chaque appel par e-mail et dans Rapports", "Transfert vers un humain", "Support prioritaire sur WhatsApp"],
  },
};

// Étiquettes calculées sur une durée moyenne de 2 minutes par appel.
export const BUSINESS_PLUS_TAG = "Plusieurs lignes, gros volumes";

// Recharge : 100 minutes supplémentaires, sans date d'expiration.
export const TOPUP = { minutes: 100, amount: 49_000 };

// Minutes en option au moment de s'abonner : 100 minutes à 39 000 FCFA au lieu de 49 000 (même coût pour nous qu'une recharge).
export const ADDON = { minutes: 100, amount: 39_000 };

// Offre de sortie : −10 % sur l'annuel pendant 48 h, une seule fois par entreprise, jamais cumulée avec l'avant-première.
// Pire cas Essentiel annuel : 531 000 FCFA / 12 = 44 250 FCFA par mois pour ~29 000 FCFA de coûts + 4 %.
export const EXIT_OFFER = { discount: 0.1, hours: 48 };

// Avant-première : −20 % pendant la première année pour les premières entreprises.
export const EARLY_BIRD = { discount: 0.2, slots: 10 };

// Annuel = 10 mois payés pour 12 (−17 %).
export const PERIOD_LABEL: Record<Period, string> = { monthly: "mois", yearly: "an" };

export function planPrice(plan: PlanId, period: Period, earlyBird: boolean) {
  const base = PLANS[plan][period];
  // Arrondi à la centaine de francs inférieure.
  return earlyBird ? Math.floor((base * (1 - EARLY_BIRD.discount)) / 100) * 100 : base;
}

// Prix annuel avec l'offre de sortie (sans avant-première).
export function exitOfferPrice(plan: PlanId) {
  return Math.floor((PLANS[plan].yearly * (1 - EXIT_OFFER.discount)) / 100) * 100;
}

export function formatFcfa(n: number) {
  return `${new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ")} FCFA`;
}

export function isPlan(v: unknown): v is PlanId {
  return v === "essentiel" || v === "pro";
}
