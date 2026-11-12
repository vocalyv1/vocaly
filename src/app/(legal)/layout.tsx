import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/"><Logo className="h-8 w-auto" /></Link>
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Version provisoire, à compléter et à faire valider par un juriste avant l&apos;ouverture commerciale.
      </div>
      <article className="mt-8 space-y-4 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-gris">
        {children}
      </article>
    </main>
  );
}
