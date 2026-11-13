import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { Empty, PageHeader, STATUS_LABELS, StatusBadge, formatDate, formatDuration } from "@/components/app/ui";
import { FollowUpDone } from "./FollowUpDone";

const PERIODS = { "7": "7 derniers jours", "30": "30 derniers jours", "90": "3 derniers mois", all: "Tout" } as const;

export default async function CallsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, business, agent } = await getWorkspace();
  const sp = await searchParams;
  const period = (sp.periode ?? "30") as keyof typeof PERIODS;
  const status = sp.statut ?? "";
  const q = (sp.q ?? "").trim();
  const tests = sp.tests === "1";
  const todoView = sp.vue === "a-rappeler";

  // Appels réels dont l'action demandée n'est pas encore faite.
  const { data: todo } = await supabase
    .from("calls")
    .select("id, created_at, started_at, caller_number, caller_name, caller_contact, request_type, next_action, urgency, is_lead, has_appointment_request")
    .eq("business_id", business.id).eq("channel", "phone").eq("report_status", "ready").neq("status", "resolved")
    .is("follow_up_done_at", null).not("next_action", "is", null).neq("next_action", "Aucune")
    .order("created_at", { ascending: false }).limit(100);
  const todoCount = todo?.length ?? 0;

  let query = supabase
    .from("calls")
    .select("id, created_at, started_at, caller_number, caller_name, duration_seconds, status, request_type, summary, urgency, is_lead, has_appointment_request, channel")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (period !== "all" && PERIODS[period]) query = query.gte("created_at", new Date(Date.now() - Number(period) * 864e5).toISOString());
  if (status && STATUS_LABELS[status]) query = query.eq("status", status);
  if (!tests) query = query.eq("channel", "phone");
  if (q) {
    const safe = q.replace(/[%,()*]/g, " ").slice(0, 60);
    query = query.or(`caller_name.ilike.%${safe}%,caller_number.ilike.%${safe}%,request_type.ilike.%${safe}%,summary.ilike.%${safe}%`);
  }
  const { data: calls } = await query;

  return (
    <div>
      <PageHeader title="Appels" subtitle="Chaque appel reçu par votre agent, avec son résumé et la transcription." />
      <div className="mb-5 inline-flex rounded-full bg-surface p-1 text-sm">
        <Link href="/app/appels" className={`rounded-full px-4 py-2 transition-colors ${!todoView ? "bg-brand text-sur-brand" : "text-gris hover:text-noir"}`}>Tous les appels</Link>
        <Link href="/app/appels?vue=a-rappeler" className={`rounded-full px-4 py-2 transition-colors ${todoView ? "bg-brand text-sur-brand" : "text-gris hover:text-noir"}`}>
          À rappeler{todoCount > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">{todoCount}</span>}
        </Link>
      </div>
      {todoView ? (
        !todo || todo.length === 0 ? (
          <Empty title="Rien à rappeler" text="Les appels qui demandent une action de votre part (rappel, devis, rendez-vous à confirmer) apparaîtront ici." />
        ) : (
          <ul className="overflow-hidden rounded-3xl bg-surface">
            {todo.map((c) => {
              const phone = c.caller_contact || c.caller_number;
              return (
                <li key={c.id} className="flex flex-col gap-3 border-b border-ligne p-4 last:border-b-0 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.next_action}</p>
                    <p className="mt-0.5 text-sm text-gris">
                      {c.caller_name || "Nom non communiqué"}{c.request_type && ` · ${c.request_type}`} · {formatDate(c.started_at ?? c.created_at, business.timezone)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                      {c.urgency === "haute" && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">Urgent</span>}
                      {c.is_lead && <span className="rounded-full bg-perle px-2 py-0.5 font-semibold">Prospect</span>}
                      {c.has_appointment_request && <span className="rounded-full bg-perle px-2 py-0.5 font-semibold">RDV à confirmer</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="rounded-full border border-ligne px-4 py-2 text-sm font-medium hover:bg-perle">Appeler {phone}</a>}
                    <Link href={`/app/appels/${c.id}`} className="rounded-full border border-ligne px-4 py-2 text-sm font-medium hover:bg-perle">Détails</Link>
                    <FollowUpDone id={c.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : (<>
      <form className="mb-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Rechercher un nom, un numéro, une demande…" className="input max-w-xs flex-1" />
        <select name="periode" defaultValue={period} className="input w-auto">
          {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="statut" defaultValue={status} className="input w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label className="flex items-center gap-2 px-2 text-sm text-gris">
          <input type="checkbox" name="tests" value="1" defaultChecked={tests} /> Inclure les tests
        </label>
        <button className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-sur-brand">Filtrer</button>
      </form>

      {!calls || calls.length === 0 ? (
        <Empty
          title={q || status ? "Aucun appel ne correspond" : "Aucun appel pour le moment"}
          text={
            q || status
              ? "Modifiez la recherche ou les filtres."
              : agent?.phone_status === "connected"
                ? "Les appels reçus par votre agent apparaîtront ici quelques secondes après avoir raccroché."
                : "Les appels apparaîtront ici dès que votre numéro sera connecté. En attendant, testez votre agent depuis « Mon agent »."
          }
          href={q || status ? undefined : "/app/agent"}
          cta="Tester mon agent"
        />
      ) : (
        <div className="overflow-hidden rounded-3xl bg-surface">
          {calls.map((c) => (
            <Link key={c.id} href={`/app/appels/${c.id}`} className="flex flex-col gap-1 border-b border-ligne p-4 last:border-b-0 transition-colors hover:bg-perle md:flex-row md:items-center md:gap-4">
              <div className="w-40 shrink-0 text-sm text-gris">{formatDate(c.started_at ?? c.created_at, business.timezone)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {c.caller_name || c.caller_number || (c.channel === "web_test" ? "Test navigateur" : "Numéro masqué")}
                  {c.request_type && <span className="font-normal text-gris"> · {c.request_type}</span>}
                </p>
                {c.summary && <p className="truncate text-sm text-gris">{c.summary}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                {c.channel === "web_test" && <span className="rounded-full border border-ligne px-2 py-0.5">Test</span>}
                {c.urgency === "haute" && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">Urgent</span>}
                {c.is_lead && <span className="rounded-full bg-perle px-2 py-0.5 font-semibold">Prospect</span>}
                {c.has_appointment_request && <span className="rounded-full bg-perle px-2 py-0.5 font-semibold">RDV demandé</span>}
                <span className="text-gris">{formatDuration(c.duration_seconds)}</span>
                <StatusBadge status={c.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}
