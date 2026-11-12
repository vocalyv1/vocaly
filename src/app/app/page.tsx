import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { Card, PageHeader, StatusBadge, formatDate, formatDuration } from "@/components/app/ui";

const DAYS = 30;
const PHONE_STATUS: Record<string, string> = {
  not_configured: "Numéro non configuré",
  configuring: "Numéro en cours de configuration",
  connected: "Numéro connecté",
  error: "Problème sur le numéro",
  disabled: "Numéro désactivé",
};

function dayKey(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export default async function Overview() {
  const { supabase, business, agent } = await getWorkspace();
  const tz = business.timezone || "Africa/Brazzaville";
  const since = new Date(Date.now() - DAYS * 864e5);
  const { data } = await supabase
    .from("calls")
    .select("id, created_at, started_at, status, duration_seconds, is_lead, has_appointment_request, caller_name, caller_number, request_type")
    .eq("business_id", business.id)
    .eq("channel", "phone")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);
  const calls = data ?? [];

  const count = (s: string) => calls.filter((c) => c.status === s).length;
  const durations = calls.map((c) => c.duration_seconds).filter((d): d is number => d != null);
  const analysed = calls.filter((c) => c.status !== "processing" && c.status !== "error").length;
  const handled = count("resolved") + count("transferred") + count("message");
  const stats = [
    { label: "Appels reçus", value: String(calls.length) },
    { label: "Traités", value: String(count("resolved")), green: true },
    { label: "Transférés", value: String(count("transferred")) },
    { label: "Messages pris", value: String(count("message")) },
    { label: "Non résolus", value: String(count("unresolved")) },
    { label: "Durée moyenne", value: durations.length ? formatDuration(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)) : "—" },
    { label: "Prospects", value: String(calls.filter((c) => c.is_lead).length) },
    { label: "Demandes de RDV", value: String(calls.filter((c) => c.has_appointment_request).length) },
    { label: "Taux de prise en charge", value: analysed ? `${Math.round((handled / analysed) * 100)} %` : "—" },
  ];

  // Histogramme des appels par jour (fuseau de l'entreprise).
  const days: { key: string; label: string; n: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push({ key: dayKey(d, tz), label: new Intl.DateTimeFormat("fr-FR", { timeZone: tz, day: "numeric", month: "short" }).format(d), n: 0 });
  }
  const idx = new Map(days.map((d, i) => [d.key, i]));
  for (const c of calls) {
    const i = idx.get(dayKey(new Date(c.started_at ?? c.created_at), tz));
    if (i != null) days[i].n++;
  }
  const max = Math.max(1, ...days.map((d) => d.n));

  const steps = [
    { done: Boolean(agent), label: "Créer votre agent", href: "/app/agent" },
    { done: Boolean(agent?.provider_test_agent_id), label: "Le tester dans le navigateur", href: "/app/agent" },
    { done: (agent?.published_version ?? 0) > 0, label: "Publier une première version", href: "/app/agent" },
    { done: agent?.phone_status === "connected", label: "Connecter votre numéro", href: "/app/telephone" },
  ];

  return (
    <div>
      <PageHeader title="Vue d'ensemble" subtitle={`Les ${DAYS} derniers jours, appels réels uniquement (les tests ne sont pas comptés).`} />

      {steps.some((s) => !s.done) && (
        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-bold">Pour démarrer</h2>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-traite text-white" : "border border-ligne text-gris"}`}>{s.done ? "✓" : i + 1}</span>
                {s.done ? <span className="text-gris line-through">{s.label}</span> : <Link href={s.href} className="font-semibold underline">{s.label}</Link>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {agent && (
          <span className="rounded-full border border-ligne px-3 py-1">
            {agent.name} : {agent.published_version > 0 ? `version ${agent.published_version} publiée` : "brouillon non publié"}
          </span>
        )}
        <span className="rounded-full border border-ligne px-3 py-1">{PHONE_STATUS[agent?.phone_status ?? "not_configured"]}</span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4">
            <p className="text-sm text-gris">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.green && s.value !== "0" ? "text-traite" : ""}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">Appels par jour</h2>
        {calls.length === 0 ? (
          <p className="text-sm text-gris">Aucun appel réel sur la période. Le graphique se remplira avec les premiers appels.</p>
        ) : (
          <svg viewBox={`0 0 ${DAYS * 20} 130`} className="w-full" role="img" aria-label="Nombre d'appels par jour">
            {days.map((d, i) => {
              const h = (d.n / max) * 100;
              return (
                <g key={d.key}>
                  <title>{`${d.label} : ${d.n} appel${d.n > 1 ? "s" : ""}`}</title>
                  <rect x={i * 20 + 3} y={105 - h} width={14} height={Math.max(h, d.n ? 2 : 0)} rx={3} className="fill-noir" />
                  {i % 5 === 0 && <text x={i * 20 + 10} y={124} textAnchor="middle" className="fill-gris text-[9px]">{d.label}</text>}
                </g>
              );
            })}
            <line x1="0" x2={DAYS * 20} y1="105.5" y2="105.5" className="stroke-ligne" />
          </svg>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Derniers appels</h2>
          <Link href="/app/appels" className="text-sm font-semibold underline">Tout voir</Link>
        </div>
        {calls.length === 0 ? (
          <p className="text-sm text-gris">Aucun appel pour le moment.</p>
        ) : (
          <ul className="divide-y divide-ligne">
            {calls.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/app/appels/${c.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                  <span className="w-36 shrink-0 text-sm text-gris">{formatDate(c.started_at ?? c.created_at, tz)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.caller_name || c.caller_number || "Numéro masqué"}{c.request_type && <span className="text-gris"> · {c.request_type}</span>}</span>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
