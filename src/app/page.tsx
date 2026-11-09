import Link from "next/link";
import { BRAND } from "@/lib/brand";

// Landing page minimale (règle Leo : un titre qui dit le bénéfice + un bouton interactif).
// La version finale arrive vendredi avec le nom et l'identité visuelle.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <p className="mb-4 font-semibold text-emerald-700">{BRAND.name}</p>
      <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
        Ne ratez plus aucun appel client, même à 23&nbsp;h.
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Un agent IA décroche, répond avec vos informations, prend les rendez-vous et vous envoie un rapport après chaque appel.
      </p>
      <Link
        href="/onboarding"
        className="mt-8 inline-flex w-fit rounded-xl bg-emerald-600 px-6 py-4 text-lg font-medium text-white"
      >
        Créer mon agent en 5 minutes
      </Link>
    </main>
  );
}
