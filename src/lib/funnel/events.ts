// Étapes du parcours mesurées (visite → quiz → inscription → agent → paiement).
export const FUNNEL_EVENTS = [
  "landing_view", "cta_click", "hero_start", "quiz_start", "quiz_step", "quiz_done", "signup_view", "signup_done",
  "agent_saved", "test_call", "paywall_view", "paywall_click", "billing_view", "payment_started", "payment_completed",
  "exit_offer_shown", "exit_offer_accepted", "addon_checked",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export function isFunnelEvent(v: unknown): v is FunnelEvent {
  return typeof v === "string" && (FUNNEL_EVENTS as readonly string[]).includes(v);
}
