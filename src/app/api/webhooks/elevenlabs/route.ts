import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import { processCall, transcriptToText } from "@/lib/calls/process";

export const runtime = "nodejs";
export const maxDuration = 120;

// Signature ElevenLabs : en-tête « t=<horodatage>,v0=<hmac sha256 hex de "t.corps"> », tolérance 30 min.
function verify(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => [p.slice(0, p.indexOf("=")), p.slice(p.indexOf("=") + 1)]));
  const t = Number(parts.t);
  if (!t || !parts.v0) return false;
  if (Math.abs(Date.now() / 1000 - t) > 30 * 60) return false;
  const digest = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(parts.v0);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Payload = {
  type: string;
  data: {
    agent_id: string;
    conversation_id: string;
    status?: string;
    transcript?: { role: string; message: string | null; time_in_call_secs?: number }[];
    metadata?: { start_time_unix_secs?: number; call_duration_secs?: number; cost?: number; phone_call?: Record<string, unknown> } & Record<string, unknown>;
    conversation_initiation_client_data?: { dynamic_variables?: Record<string, unknown> };
  };
};

export async function POST(req: Request) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook non configuré" }, { status: 503 });
  const raw = await req.text();
  if (!verify(raw, req.headers.get("elevenlabs-signature"), secret)) {
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }
  const event = JSON.parse(raw) as Payload;
  if (event.type !== "post_call_transcription") return NextResponse.json({ ok: true, ignored: event.type });

  const d = event.data;
  if (!/^[\w-]{1,100}$/.test(d.agent_id ?? "") || !d.conversation_id) return NextResponse.json({ error: "données invalides" }, { status: 400 });
  const db = createAdminClient();
  const { data: agent } = await db
    .from("agents")
    .select("id, business_id, name, provider_agent_id, provider_test_agent_id")
    .or(`provider_agent_id.eq.${d.agent_id},provider_test_agent_id.eq.${d.agent_id}`)
    .limit(1)
    .maybeSingle();
  if (!agent) {
    await logError("webhook", "Agent inconnu", { agent_id: d.agent_id, conversation_id: d.conversation_id });
    return NextResponse.json({ ok: true, unknown_agent: true });
  }

  const isTest = agent.provider_test_agent_id === d.agent_id;
  const vars = d.conversation_initiation_client_data?.dynamic_variables ?? {};
  const phone = (d.metadata?.phone_call ?? {}) as Record<string, unknown>;
  const caller = (vars["system__caller_id"] as string) || (phone["external_number"] as string) || null;
  const start = d.metadata?.start_time_unix_secs ? new Date(d.metadata.start_time_unix_secs * 1000) : null;
  const dur = d.metadata?.call_duration_secs ?? null;
  const turns = d.transcript ?? [];

  const { data: call, error } = await db
    .from("calls")
    .upsert(
      {
        provider_call_id: d.conversation_id,
        agent_id: agent.id,
        business_id: agent.business_id,
        channel: isTest || !caller ? "web_test" : "phone",
        is_test: isTest,
        caller_number: caller,
        started_at: start?.toISOString() ?? null,
        ended_at: start && dur != null ? new Date(start.getTime() + dur * 1000).toISOString() : null,
        duration_seconds: dur,
        transcript: transcriptToText(turns, agent.name),
        transcript_json: turns,
        provider_metadata: d.metadata ?? null,
      },
      { onConflict: "provider_call_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();
  if (error || !call) {
    await logError("webhook", "Enregistrement de l'appel impossible", { error: error?.message, conversation_id: d.conversation_id }, agent.business_id);
    return NextResponse.json({ error: "enregistrement impossible" }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  after(() => processCall(call.id, site));
  return NextResponse.json({ ok: true });
}
