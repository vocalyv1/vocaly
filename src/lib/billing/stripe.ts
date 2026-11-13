import "server-only";
import Stripe from "stripe";

// Paiement par carte via Stripe Checkout. Les clés restent côté serveur (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).
export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return client;
}

// Le FCFA (XAF) est une devise sans décimales chez Stripe : le montant est passé tel quel.
export async function createCheckout(args: {
  paymentId: string; items: { label: string; amount: number }[]; email: string | null; siteUrl: string;
}) {
  return stripe().checkout.sessions.create({
    mode: "payment",
    line_items: args.items.map((i) => ({ quantity: 1, price_data: { currency: "xaf", unit_amount: i.amount, product_data: { name: i.label } } })),
    client_reference_id: args.paymentId,
    metadata: { payment_id: args.paymentId },
    payment_intent_data: { metadata: { payment_id: args.paymentId } },
    customer_email: args.email ?? undefined,
    locale: "fr",
    success_url: `${args.siteUrl}/app/abonnement?paiement=${args.paymentId}`,
    cancel_url: `${args.siteUrl}/app/abonnement?annule=1`,
  });
}
