import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/app/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center p-6 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Espace client en cours d&apos;activation</h1>
        <p className="mt-3 text-gris">
          La base de données n&apos;est pas encore branchée sur ce déploiement. Les variables Supabase doivent être
          ajoutées dans Vercel avant d&apos;ouvrir l&apos;espace client.
        </p>
        <Link href="/" className="mt-6 text-sm font-semibold underline">Retour au site</Link>
      </main>
    );
  }
  const { business, user } = await getWorkspace();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-ligne bg-surface p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between md:mb-8 md:block">
          <Link href="/app"><Logo className="h-8 w-auto" /></Link>
          <p className="truncate text-sm font-semibold md:mt-4">{business.name}</p>
        </div>
        <Nav />
        <div className="mt-4 hidden border-t border-ligne pt-4 md:mt-auto md:block">
          <p className="truncate px-3 pb-2 text-xs text-gris">{user.email}</p>
          <ThemeToggle inline />
          <form action="/auth/deconnexion" method="post">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-gris hover:bg-perle hover:text-noir">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-10">{children}</main>
    </div>
  );
}
