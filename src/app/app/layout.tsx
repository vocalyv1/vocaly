import Link from "next/link";
import { Logo } from "@/components/Logo";
import { TopNav } from "@/components/app/TopNav";
import { MobileThemeButton, SideRail } from "@/components/app/SideRail";
import { SoundEffects } from "@/components/app/SoundEffects";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getWorkspace } from "@/lib/workspace";
import { AccountNotices, SetupBar } from "@/components/app/AccountBar";
import { HelpButton } from "@/components/app/HelpButton";
import { accountNotices } from "@/lib/billing/insights";
import { isActive, type Subscription } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";

function initials(s: string) {
  return s.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) {
    return (
      <main className="app-shell mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center p-6 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl">Espace client en cours d&apos;activation</h1>
        <p className="mt-3 text-gris">
          La base de données n&apos;est pas encore branchée sur ce déploiement. Les variables Supabase doivent être
          ajoutées dans Vercel avant d&apos;ouvrir l&apos;espace client.
        </p>
        <Link href="/" className="mt-6 text-sm font-semibold underline">Retour au site</Link>
      </main>
    );
  }
  const { business, user, supabase, agent } = await getWorkspace();
  // Pastille sur « Appels » : appels réels des dernières 24 h.
  const { count } = await supabase
    .from("calls").select("id", { count: "exact", head: true })
    .eq("business_id", business.id).eq("channel", "phone")
    .gte("created_at", new Date(Date.now() - 864e5).toISOString());

  // Abonnement et étapes de mise en service (tests, connaissances, offre, numéro, premier vrai appel).
  const [{ data: subRow }, tests, knowledge, realCalls] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("business_id", business.id).maybeSingle(),
    supabase.from("calls").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("channel", "web_test"),
    agent ? supabase.from("knowledge_sources").select("id", { count: "exact", head: true }).eq("agent_id", agent.id) : Promise.resolve({ count: 0 }),
    supabase.from("calls").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("channel", "phone"),
  ]);
  const sub = (subRow ?? null) as Subscription | null;
  const steps = [
    { done: (tests.count ?? 0) > 0, label: "Tester votre agent", href: "/app/agent?tester=1#tester" },
    { done: (knowledge.count ?? 0) > 0, label: "Ajouter ses connaissances", href: "/app/agent/connaissances" },
    { done: isActive(sub), label: "Choisir votre offre", href: "/app/abonnement" },
    { done: agent?.phone_status === "connected", label: "Connecter votre numéro", href: "/app/telephone" },
    { done: (realCalls.count ?? 0) > 0, label: "Recevoir le premier appel", href: "/app/appels" },
  ];

  return (
    <div className="app-shell">
      <SoundEffects />
      <SideRail />
      <header className="sticky top-0 z-10 bg-perle/80 px-4 py-3 backdrop-blur-md md:px-8 md:pl-24 [[data-theme=dark]_&]:bg-fond/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 md:flex-nowrap">
          <Link href="/app" className="flex shrink-0 items-center gap-2.5">
            <Logo className="h-7 w-auto" />
            <span className="hidden max-w-36 truncate border-l border-ligne pl-2.5 text-sm text-gris xl:block">{business.name}</span>
          </Link>
          <div className="order-last w-full min-w-0 md:order-none md:flex md:w-auto md:flex-1 md:justify-center">
            <TopNav badges={count ? { "/app/appels": count } : {}} />
          </div>
          <span className="ml-auto md:hidden" />
          <MobileThemeButton />
          <Link href="/app/compte" title={user.email ?? ""} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold">
            {initials(user.user_metadata?.full_name || user.email || "V")}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 md:px-8 md:pl-24">
        <AccountNotices notices={accountNotices(sub, business.timezone)} />
        <SetupBar steps={steps} />
        {children}
      </main>
      <HelpButton />
    </div>
  );
}
