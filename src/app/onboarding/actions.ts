"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { QuizAnswersSchema } from "@/lib/quiz";
import { AgentDraftSchema } from "@/lib/agent/schema";

const PayloadSchema = z.object({ answers: QuizAnswersSchema, draft: AgentDraftSchema });

export type SaveResult = { ok: true } | { ok: false; reason: "auth" | "invalid" | "error" | "not_ready"; message?: string };

const TONE_FROM_QUIZ: Record<string, string> = { formal: "formal", warm: "warm", direct: "direct" };

// Crée l'entreprise et son agent à partir du quiz, pour l'utilisateur connecté.
export async function saveOnboarding(payload: unknown): Promise<SaveResult> {
  if (!supabaseConfigured) return { ok: false, reason: "not_ready" };
  const parsed = PayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { answers, draft } = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, reason: "auth" };

  // Une seule entreprise par compte au lancement : si elle existe déjà, on n'en recrée pas.
  const { data: existing } = await supabase.from("business_members").select("business_id").eq("user_id", user.id).limit(1);
  if (existing && existing.length > 0) return { ok: true };

  await supabase.from("profiles").upsert({ id: user.id, full_name: user.user_metadata?.full_name ?? null });

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: answers.businessName,
      sector: answers.sector,
      city: answers.city,
      description: answers.activity,
      hours: answers.hours,
      email: user.email,
      quiz_answers: answers,
    })
    .select("id")
    .single();
  if (bErr || !business) return { ok: false, reason: "error", message: bErr?.message };

  const { data: agent, error: aErr } = await supabase
    .from("agents")
    .insert({
      business_id: business.id,
      name: draft.name,
      voice_id: draft.voiceId,
      role: draft.role,
      instructions: draft.instructions,
      greeting: draft.greeting,
      speaks_first: draft.speaksFirst,
      max_call_seconds: draft.maxCallSeconds,
      transfer_rules: draft.transferRules.filter((r) => r.phone),
      tags: draft.tags,
      faq: draft.faq,
      calendar_enabled: false, // Google Agenda arrive en phase 2
      tone: TONE_FROM_QUIZ[answers.tone] ?? "warm",
      unknown_behavior: answers.transfer === "unknown" ? "transfer" : "message",
    })
    .select("id")
    .single();
  if (aErr || !agent) return { ok: false, reason: "error", message: aErr?.message };

  const answered = draft.faq.filter((f) => f.a.trim());
  if (answered.length) {
    await supabase.from("knowledge_sources").insert(
      answered.map((f) => ({ agent_id: agent.id, kind: "faq", category: "faq", title: f.q, content: f.a.trim(), status: "pending" })),
    );
  }
  return { ok: true };
}
