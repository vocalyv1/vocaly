import { NextResponse } from "next/server";
import { pawapayConfigured } from "@/lib/billing/pawapay";
import { syncPayment } from "@/lib/billing/subscription";
import { logError } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Callback PawaPay (dépôt arrivé à un statut final). Le corps n'est pas cru sur parole :
// on relit le statut du dépôt auprès de l'API PawaPay avant toute activation.
export async function POST(req: Request) {
  if (!pawapayConfigured()) return NextResponse.json({ error: "paiement non configuré" }, { status: 503 });
  let body: { depositId?: unknown } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "corps invalide" }, { status: 400 }); }
  const id = typeof body.depositId === "string" ? body.depositId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "depositId invalide" }, { status: 400 });
  try {
    const status = await syncPayment(id);
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    await logError("pawapay", "Callback : vérification impossible", { id, error: String(e) });
    return NextResponse.json({ error: "vérification impossible" }, { status: 500 });
  }
}
