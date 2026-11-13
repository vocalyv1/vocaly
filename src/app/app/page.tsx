import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { Card, LivePill, Segmented, StatusBadge, formatDate, formatDuration } from "@/components/app/ui";
import { BarChart, CountUp, Gauge, MiniBars, Sparkline } from "@/components/app/viz";

const PERIODS = { "7": 7, "30": 30, "90": 90 } as const;
const PHONE_STATUS: Record<string, string> = {
  not_configured: "Numéro non configuré",
  configuring: "Numéro en cours de mise en service",
  connected: "Numéro connecté",
  error: "Problème sur le numéro",
  disabled: "Numéro désactivé",
};

function dayKey(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { supabase, business, agent } = await getWorkspace();
  const sp = await searchParams;
  const pkey = (sp.periode && sp.periode in PERIODS ? sp.periode : "30") as keyof typeof PERIODS;
  const DAYS = PERIODS[pkey];
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
  const rate = analysed ? Math.round((handled / analysed) * 100) : null;
  const leads = calls.filter((c) => c.is_lead).length;
  const rdv = calls.filter((c) => c.has_appointment_request).length;

  // Séries quotidiennes (fuseau de l'entreprise).
  const days: { key: string; label: string; total: number; resolved: number; leads: number; rdv: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push({ key: dayKey(d, tz), label: new Intl.DateTimeFormat("fr-FR", { timeZone: tz, day: "numeric", month: "short" }).format(d), total: 0, resolved: 0, leads: 0, rdv: 0 });
  }
  const idx = new Map(days.map((d, i) => [d.key, i]));
  for (const c of calls) {
    const i = idx.get(dayKey(new Date(c.started_at ?? c.created_at), tz));
    if (i == null) continue;
    days[i].total++;
    if (c.status === "resolved") days[i].resolved++;
    if (c.is_lead) days[i].leads++;
    if (c.has_appointment_request) days[i].rdv++;
  }
  const last7 = days.slice(-7);

  // Ce que l'agent a fait pour l'entreprise : uniquement des chiffres tirés des appels réels.
  const hourOf = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d));
  const weekdayOf = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short" }).format(d);
  const offHours = calls.filter((c) => {
    const d = new Date(c.started_at ?? c.created_at);
    const h = hourOf(d);
    return h >= 18 || h < 8 || weekdayOf(d) === "Sun";
  }).length;
  const talkMin = Math.round(durations.reduce((a, b) => a + b, 0) / 60);
  const agentName = agent?.name ?? "Votre agent";
  const live = (agent?.published_version ?? 0) > 0 && agent?.phone_status === "connected";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl leading-tight md:text-[2.5rem]">Vue d&apos;ensemble</h1>
        <LivePill on={live} label={live ? `${agent?.name} répond aux appels` : PHONE_STATUS[agent?.phone_status ?? "not_configured"]} />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented active={pkey} items={[
          { value: "7", label: "7 jours", href: "/app?periode=7" },
          { value: "30", label: "30 jours", href: "/app?periode=30" },
          { value: "90", label: "90 jours", href: "/app?periode=90" },
        ]} />
        <p className="text-xs text-gris">Appels réels uniquement, les tests ne sont pas comptés.</p>
      </div>

      <div className="rise mb-5 rounded-3xl bg-surface p-6">
        {calls.length > 0 ? (
          <p className="text-lg leading-relaxed md:text-xl">
            Sur les {DAYS} derniers jours, <b>{agentName}</b> a décroché <b>{calls.length} appel{calls.length > 1 ? "s" : ""}</b>
            {offHours > 0 && <>, dont <b className="text-traite">{offHours} le soir, la nuit ou le dimanche</b></>}
            {rdv > 0 && <>, noté <b>{rdv} demande{rdv > 1 ? "s" : ""} de rendez-vous</b></>}
            {leads > 0 && <> et repéré <b>{leads} prospect{leads > 1 ? "s" : ""}</b></>}.
            {talkMin > 0 && <> Cela représente <b>{talkMin} minute{talkMin > 1 ? "s" : ""} au téléphone</b> que votre équipe n&apos;a pas eu à passer.</>}
          </p>
        ) : (
          <p className="text-gris">Dès les premiers appels reçus sur votre numéro, vous verrez ici ce que {agentName} a fait pour vous : appels décrochés, appels du soir et du dimanche, rendez-vous notés et prospects repérés. Les appels de test ne sont pas comptés.</p>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="lift rise col-span-2 rounded-3xl bg-brand p-5 text-sur-brand sm:col-span-1">
          <p className="text-xs opacity-60">Appels reçus</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-4xl font-medium"><CountUp value={calls.length} /></p>
            <MiniBars data={last7.map((d) => d.total)} />
          </div>
          <Link href="/app/appels" className="mt-4 inline-block text-xs opacity-60 hover:opacity-100">Voir les appels →</Link>
        </div>
        {[
          { label: "Traités", value: count("resolved"), series: days.map((d) => d.resolved), green: true, href: "/app/appels?statut=resolved" },
          { label: "Prospects", value: leads, series: days.map((d) => d.leads), href: "/app/appels" },
          { label: "Demandes de RDV", value: rdv, series: days.map((d) => d.rdv), href: "/app/appels" },
        ].map((k, i) => (
          <Link key={k.label} href={k.href} className="lift rise rounded-3xl bg-surface p-5" style={{ animationDelay: `${(i + 1) * 70}ms` }}>
            <p className="text-xs text-gris">{k.label}</p>
            <p className={`mt-2 text-3xl font-medium ${k.green && k.value ? "text-traite" : ""}`}><CountUp value={k.value} /></p>
            <Sparkline data={k.series} className={`mt-3 ${k.green && k.value ? "text-traite" : "text-gris"}`} />
          </Link>
        ))}
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rise flex flex-col justify-between rounded-3xl bg-brand p-6 text-sur-brand">
          <p className="text-sm opacity-70">Taux de prise en charge</p>
          <div className="my-4"><Gauge value={rate} label="des appels traités, transférés ou avec message" /></div>
          <div className="grid grid-cols-2 gap-3 border-t border-sur-brand/15 pt-4 text-sm">
            <div><p className="opacity-60">Transférés</p><p className="text-xl"><CountUp value={count("transferred")} /></p></div>
            <div><p className="opacity-60">Messages pris</p><p className="text-xl"><CountUp value={count("message")} /></p></div>
            <div><p className="opacity-60">Non résolus</p><p className="text-xl"><CountUp value={count("unresolved")} /></p></div>
            <div><p className="opacity-60">Durée moyenne</p><p className="text-xl">{durations.length ? formatDuration(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)) : "—"}</p></div>
          </div>
        </div>
        <Card className="rise">
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className="text-sm text-gris">Appels par jour</p>
              <p className="text-3xl font-medium"><CountUp value={calls.length} /> <span className="text-sm text-gris">sur {DAYS} jours</span></p>
            </div>
          </div>
          <BarChart days={days.map(({ label, total, resolved }) => ({ label, total, resolved }))} />
        </Card>
      </div>

      <Card className="rise">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">Derniers appels</h2>
          <Link href="/app/appels" className="rounded-full bg-perle px-3 py-1.5 text-xs">Tout voir</Link>
        </div>
        {calls.length === 0 ? (
          <p className="py-6 text-center text-sm text-gris">Aucun appel réel sur la période. Ils apparaîtront ici dès que votre numéro sera connecté.</p>
        ) : (
          <ul className="divide-y divide-ligne">
            {calls.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/app/appels/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-perle">
                  <span className="w-36 shrink-0 text-sm text-gris">{formatDate(c.started_at ?? c.created_at, tz)}</span>
                  <span className="min-w-0 flex-1 truncate">{c.caller_name || c.caller_number || "Numéro masqué"}{c.request_type && <span className="text-gris"> · {c.request_type}</span>}</span>
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
