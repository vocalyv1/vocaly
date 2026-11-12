import Link from "next/link";
import { notFound } from "next/navigation";
import type { CallReport } from "@/lib/calls/report";
import { getWorkspace } from "@/lib/workspace";
import { Card, Notice, StatusBadge, formatDate, formatDuration } from "@/components/app/ui";
import { CallActions } from "./CallActions";

const NC = "Non communiqué";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business, agent } = await getWorkspace();
  const { data: c } = await supabase.from("calls").select("*").eq("id", id).eq("business_id", business.id).maybeSingle();
  if (!c) notFound();
  const r = c.report as CallReport | null;
  const turns = (c.transcript_json ?? []) as { role: string; message: string | null; time_in_call_secs?: number }[];

  const fields: [string, string][] = r
    ? [
        ["Nom", r.caller_name],
        ["Téléphone donné", r.caller_phone],
        ["E-mail", r.caller_email],
        ["Type de demande", r.request_type],
        ["Détails", r.request_details],
        ["Urgence", r.urgency],
        ["Rendez-vous", r.appointment_requested ? `Demandé : ${r.appointment_preference}. À confirmer par vous.` : "Non demandé"],
        ["Prospect", r.is_lead ? "Oui" : "Non"],
        ["Ressenti de l'appelant", r.caller_sentiment],
        ["Prochaine action", r.next_action],
      ]
    : [];

  return (
    <div>
      <Link href="/app/appels" className="text-sm text-gris hover:text-noir">← Tous les appels</Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{r?.request_type ?? (c.channel === "web_test" ? "Test navigateur" : "Appel")}</h1>
        <StatusBadge status={c.status} />
        {c.channel === "web_test" && <span className="rounded-full border border-ligne px-2 py-0.5 text-xs">Test</span>}
      </div>
      <div className="mb-6 grid gap-3 text-sm sm:grid-cols-3">
        <Card><p className="text-gris">Date</p><p className="font-semibold">{formatDate(c.started_at ?? c.created_at, business.timezone)}</p></Card>
        <Card><p className="text-gris">Durée</p><p className="font-semibold">{formatDuration(c.duration_seconds)}</p></Card>
        <Card><p className="text-gris">Numéro appelant</p><p className="font-semibold">{c.caller_number ?? NC}</p></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg font-bold">Résumé</h2>
            {c.report_status === "ready" && r ? (
              <>
                <p className="mb-4">{r.summary}</p>
                <dl className="divide-y divide-ligne text-sm">
                  {fields.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[40%_1fr] gap-3 py-2">
                      <dt className="text-gris">{k}</dt>
                      <dd className={v === NC ? "text-gris italic" : ""}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : c.report_status === "error" ? (
              <Notice tone="error">Le résumé n&apos;a pas pu être produit : {c.report_error ?? "erreur inconnue"}. La transcription reste disponible.</Notice>
            ) : (
              <p className="text-sm text-gris">Analyse en cours… Rechargez la page dans quelques secondes.</p>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-bold">Suivi</h2>
            <CallActions id={c.id} status={c.status} canRetry={c.report_status === "error"} />
          </Card>
        </div>
        <Card>
          <h2 className="mb-3 text-lg font-bold">Transcription</h2>
          {turns.length === 0 ? (
            <p className="text-sm text-gris">Aucune transcription.</p>
          ) : (
            <div className="space-y-2">
              {turns.filter((t) => t.message?.trim()).map((t, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.role === "agent" ? "bg-perle" : "ml-auto bg-brand text-sur-brand"}`}>
                  <p className="mb-0.5 text-xs opacity-60">
                    {t.role === "agent" ? agent?.name ?? "Agent" : "Appelant"}
                    {t.time_in_call_secs != null && ` · ${Math.floor(t.time_in_call_secs / 60)}:${String(Math.round(t.time_in_call_secs % 60)).padStart(2, "0")}`}
                  </p>
                  {t.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
