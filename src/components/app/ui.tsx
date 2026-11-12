import Link from "next/link";
import { PlayOnMount } from "./SoundEffects";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl leading-tight md:text-[2.5rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-gris">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] md:p-6 ${className}`}>{children}</section>;
}

export function Empty({ title, text, href, cta }: { title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-ligne bg-surface/60 p-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gris">{text}</p>
      {href && cta && (
        <Link href={href} className="mt-5 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-sur-brand">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: React.ReactNode }) {
  const cls =
    tone === "error"
      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      : tone === "ok"
        ? "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
        : "border-ligne bg-perle text-noir";
  return (
    <div className={`rise rounded-2xl border px-4 py-3 text-sm ${cls}`}>
      {tone !== "info" && <PlayOnMount kind={tone === "ok" ? "success" : "error"} />}
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const cls =
    variant === "primary"
      ? "bg-brand text-sur-brand hover:opacity-90"
      : variant === "danger"
        ? "border border-red-300 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
        : "border border-ligne hover:bg-perle";
  return (
    <button {...props} className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 ${cls} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gris">{hint}</span>}
    </label>
  );
}

export const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  processing: { label: "En cours d'analyse", cls: "bg-perle text-gris" },
  resolved: { label: "Traité", cls: "bg-traite/10 text-traite" },
  transferred: { label: "Transféré", cls: "bg-perle text-noir" },
  message: { label: "Message pris", cls: "bg-perle text-noir" },
  unresolved: { label: "Non résolu", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  error: { label: "Erreur", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: "bg-perle text-gris" };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export function formatDuration(sec: number | null | undefined) {
  if (!sec && sec !== 0) return "Non communiqué";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m} min ${String(s).padStart(2, "0")}` : `${s} s`;
}

export function formatDate(iso: string | null | undefined, tz = "Africa/Brazzaville") {
  if (!iso) return "Non communiqué";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(new Date(iso));
}

// Pastille d'état avec point animé (ex. « Agent en ligne »).
export function LivePill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${on ? "pulse-dot bg-noir text-noir" : "bg-gris/50"}`} />
      {label}
    </span>
  );
}

// Onglets segmentés (liens) : l'actif est une pastille blanche sur fond perle.
export function Segmented({ items, active }: { items: { href: string; label: string; value: string }[]; active: string }) {
  return (
    <div className="inline-flex rounded-full bg-surface p-1">
      {items.map((i) => (
        <Link key={i.value} href={i.href} scroll={false}
          className={`rounded-full px-3 py-1 text-xs transition-all duration-300 ${i.value === active ? "bg-brand text-sur-brand" : "text-gris hover:text-noir"}`}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}
