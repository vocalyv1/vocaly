import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { isFunnelEvent } from "@/lib/funnel/events";
import { trackServer } from "@/lib/funnel/server";

// Réception des étapes du parcours envoyées par le navigateur. Événements connus seulement, contenu borné.
const Body = z.object({
  event: z.string().max(40),
  sid: z.string().max(64).nullable().optional(),
  path: z.string().max(200).nullable().optional(),
  meta: z.record(z.string().max(40), z.union([z.string().max(120), z.number(), z.boolean(), z.null()])).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const text = await req.text();
  if (text.length > 2000) return new NextResponse(null, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(text); } catch { return new NextResponse(null, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success || !isFunnelEvent(p.data.event)) return new NextResponse(null, { status: 400 });
  if (p.data.meta && Object.keys(p.data.meta).length > 8) return new NextResponse(null, { status: 400 });

  let userId: string | null = null;
  if (supabaseConfigured) {
    try {
      const { data } = await (await createClient()).auth.getUser();
      userId = data.user?.id ?? null;
    } catch {}
  }
  await trackServer(p.data.event, { userId, sessionId: p.data.sid ?? null, path: p.data.path ?? null, meta: p.data.meta ?? null });
  return new NextResponse(null, { status: 204 });
}
