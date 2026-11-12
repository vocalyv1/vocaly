import Link from "next/link";
import type { CallReport } from "@/lib/calls/report";
import { getWorkspace } from "@/lib/workspace";
import { Empty, PageHeader, Segmented, StatusBadge, formatDate, formatDuration } from "@/components/app/ui";

const NC = "Non communiqué";
const FILTERS = {
  tous: { label: "Tous", apply: () => true },
  a_traiter: { label: "À traiter", apply: (r: CallReport, s: string) => s !== "resolved" && r.next_action !== "Aucune" },
  urgents: { label: "Urgents", apply: (r: CallReport) => r.urgency === "haute" },
  prospects: { label: "Prospects", apply: (r: CallReport) => r.is_lead },
  rdv: { label: "Rendez-vous", apply: (r: CallReport) => r.appointment_requested },
} as const;

// Tous les rapports d'appels (les mêmes que ceux envoyés par e-mail), en cartes lisibles d'un coup d'œil.
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ filtre?: string; tests?: string }> }) {
  const { supabase, business } = await getWorkspace();
  const sp = await searchParams;
  const fkey = (sp.filtre && sp.filtre in FILTERS ? sp.filtre : "tous") as keyof typeof FILTERS;
  const tests = sp.tests === "1";
  let q = supabase
    .from("calls")
    .select("id, created_at, started_at, caller_number, duration_seconds, status, report, channel")
    .eq("business_id", business.id)
    .eq("report_status", "ready")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!tests) q = q.eq("channel", "phone");
  const { data } = await q;
  const all = (data ?? []).filter((c) => c.report) as { id: string; created_at: string; started_at: string | null; caller_number: string | null; duration_seconds: number | null; status: string; report: CallReport; channel: string }[];
  const rows = all.filter((c) => FILTERS[fkey].apply(c.report, c.status));
  const href = (f: string) => `/app/rapports?filtre=${f}${tests ? "&tests=1" : ""}`;

  return (
    <div>
      <PageHeader title="Rapports" subtitle="Le résumé de chaque appel analysé : qui, pourquoi, et ce qu'il reste à faire. Les mêmes que ceux envoyés par e-mail." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented active={fkey} items={Object.entries(FILTERS).map(([k, v]) => ({ value: k, label: `${v.label}${k !== "tous" ? ` · ${all.filter((c) => v.apply(c.report, c.status)).length}` : ""}`, href: href(k) }))} />
        <Link href={`/app/rapports?filtre=${fkey}${tests ? "" : "&tests=1"}`} scroll={false} className="rounded-full bg-surface px-3 py-1.5 text-xs text-gris hover:text-noir">
          {tests ? "Masquer les tests" : "Afficher aussi les tests"}
        </Link>
      </div>

      {rows.length === 0 ? (
        <Empty
          title={all.length ? "Aucun rapport dans ce filtre" : "Aucun rapport pour le moment"}
          text={all.length ? "Choisissez un autre filtre." : "Chaque appel analysé produit un rapport ici, quelques secondes après avoir raccroché. Les essais faits depuis « Mon agent » apparaissent avec « Afficher aussi les tests »."}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((c, i) => {
            const r = c.report;
            return (
              <Link key={c.id} href={`/app/appels/${c.id}`} className="lift rise flex flex-col rounded-3xl bg-surface p-5" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gris">{formatDate(c.started_at ?? c.created_at, business.timezone)} · {formatDuration(c.duration_seconds)}</span>
                  <span className="ml-auto flex flex-wrap gap-1.5">
                    {c.channel === "web_test" && <span className="rounded-full border border-ligne px-2 py-0.5">Test</span>}
                    {r.urgency === "haute" && <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800 dark:bg-red-950 dark:text-red-200">Urgent</span>}
                    {r.is_lead && <span className="rounded-full bg-perle px-2 py-0.5">Prospect</span>}
                    <StatusBadge status={c.status} />
                  </span>
                </div>
                <p className="text-lg font-medium">{r.request_type}</p>
                <p className="text-sm text-gris">
                  {r.caller_name !== NC ? r.caller_name : "Nom non communiqué"} · {r.caller_phone !== NC ? r.caller_phone : c.caller_number ?? "numéro masqué"}
                </p>
                <p className="mt-3 line-clamp-3 text-sm">{r.summary}</p>
                {r.appointment_requested && (
                  <p className="mt-3 rounded-xl bg-perle px-3 py-2 text-xs">Rendez-vous demandé : {r.appointment_preference}. À confirmer par vous.</p>
                )}
                <div className="mt-auto pt-4">
                  <p className="rounded-2xl bg-brand px-4 py-3 text-sm text-sur-brand">
                    <span className="block text-[11px] opacity-60">À faire</span>
                    {r.next_action}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
