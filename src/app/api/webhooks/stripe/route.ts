import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/billing/stripe";
import { syncPayment } from "@/lib/billing/subscription";
import { logError } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Webhook Stripe : signature vérifiée, puis la session est relue chez Stripe avant toute activation.
// Événements à cocher dans Stripe : checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, checkout.session.expired.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !secret) return NextResponse.json({ error: "paiement par carte non configuré" }, { status: 503 });
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }
  if (!event.type.startsWith("checkout.session.")) return NextResponse.json({ ok: true, ignored: event.type });
  const session = event.data.object as { client_reference_id?: string | null };
  const id = session.client_reference_id ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: true, ignored: "sans référence" });
  try {
    const status = await syncPayment(id);
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    await logError("stripe", "Webhook : vérification impossible", { id, error: String(e) });
    return NextResponse.json({ error: "vérification impossible" }, { status: 500 });
  }
}
