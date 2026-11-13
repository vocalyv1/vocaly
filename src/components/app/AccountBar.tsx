import Link from "next/link";
import type { Notice } from "@/lib/billing/insights";

type Step = { done: boolean; label: string; href: string };

// Barre « Mise en service » affichée sur toutes les pages tant que l'agent ne reçoit pas encore de vrais appels.
export function SetupBar({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done)!;
  return (
    <div className="mb-5 rounded-3xl bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">Mise en service <span className="text-gris">{done}/{steps.length}</span></p>
        <Link href={next.href} className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-sur-brand">Étape suivante : {next.label} →</Link>
      </div>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s) => (
          <Link key={s.label} href={s.href} title={s.label} className="group">
            <span className={`block h-1.5 rounded-full transition-colors ${s.done ? "bg-traite" : s === next ? "bg-noir/40" : "bg-perle"}`} />
            <span className={`mt-1.5 hidden text-[11px] leading-tight md:block ${s.done ? "text-gris line-through" : "text-noir group-hover:underline"}`}>{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const TONE = {
  error: "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100",
  warn: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  info: "bg-surface text-noir",
};

// Bandeaux : fin d'offre, offre expirée, minutes presque épuisées.
export function AccountNotices({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;
  return (
    <div className="mb-5 space-y-2">
      {notices.map((n) => (
        <div key={n.text} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${TONE[n.tone]}`}>
          <span>{n.text}</span>
          <Link href={n.href} className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-sur-brand">{n.cta}</Link>
        </div>
      ))}
    </div>
  );
}
