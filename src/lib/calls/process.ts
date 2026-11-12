import "server-only";
import { createAdminClient, logError } from "@/lib/supabase/admin";
import { anthropicConfigured, generateReport } from "./report";
import { emailConfigured, sendCallEmail } from "./email";

type Turn = { role: string; message: string | null; time_in_call_secs?: number };

export function transcriptToText(turns: Turn[], agentName: string) {
  return turns
    .filter((t) => t.message && t.message.trim())
    .map((t) => `${t.role === "agent" ? agentName : "Appelant"} : ${t.message!.trim()}`)
    .join("\n");
}

function fmtDuration(sec: number | null) {
  if (sec == null) return "durée inconnue";
  return `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, "0")}`;
}

// Rapport + e-mail pour un appel déjà enregistré. Idempotent : ne refait rien si le rapport est prêt.
export async function processCall(callId: string, siteUrl: string) {
  const db = createAdminClient();
  const { data: call } = await db
    .from("calls")
    .select("id, business_id, agent_id, channel, transcript, duration_seconds, started_at, caller_number, report_status, notified_at")
    .eq("id", callId)
    .single();
  if (!call || call.report_status === "ready") return;
  const { data: business } = await db.from("businesses").select("id, name, email, timezone").eq("id", call.business_id).single();
  const { data: agent } = await db.from("agents").select("name").eq("id", call.agent_id).single();
  if (!business || !agent) return;

  if (!call.transcript?.trim()) {
    await db.from("calls").update({ report_status: "error", report_error: "Aucune parole enregistrée", status: "unresolved" }).eq("id", call.id);
    return;
  }
  if (!anthropicConfigured()) {
    await db.from("calls").update({ report_status: "error", report_error: "Analyse indisponible (clé Anthropic manquante)", status: "unresolved" }).eq("id", call.id);
    return;
  }

  try {
    const { report, usage } = await generateReport({
      businessName: business.name, agentName: agent.name, transcript: call.transcript, durationSec: call.duration_seconds,
    });
    await db.from("calls").update({
      report, report_status: "ready", report_error: null, status: report.outcome, summary: report.summary,
      request_type: report.request_type, urgency: report.urgency, is_lead: report.is_lead,
      has_appointment_request: report.appointment_requested,
      caller_name: report.caller_name === "Non communiqué" ? null : report.caller_name,
      caller_contact: report.caller_phone === "Non communiqué" ? null : report.caller_phone,
      need: report.request_details, next_action: report.next_action,
    }).eq("id", call.id);
    console.info("[report] tokens", usage.input_tokens, usage.output_tokens);

    // E-mail : seulement pour les vrais appels, une seule fois.
    if (call.channel === "phone" && !call.notified_at && business.email && emailConfigured()) {
      try {
        const when = call.started_at
          ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: business.timezone }).format(new Date(call.started_at))
          : "";
        await sendCallEmail(business.email, {
          businessName: business.name, agentName: agent.name, callUrl: `${siteUrl}/app/appels/${call.id}`, report, when,
          duration: fmtDuration(call.duration_seconds), caller: call.caller_number ?? "Non communiqué",
        });
        await db.from("calls").update({ notified_at: new Date().toISOString() }).eq("id", call.id);
      } catch (e) {
        await logError("email", "Envoi du résumé impossible", { callId: call.id, error: String(e) }, business.id);
      }
    }
  } catch (e) {
    await db.from("calls").update({ report_status: "error", report_error: "L'analyse de l'appel a échoué", status: "unresolved" }).eq("id", call.id);
    await logError("report", "Rapport impossible", { callId: call.id, error: String(e) }, business.id);
  }
}
