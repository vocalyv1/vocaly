import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { signUp } from "../actions";
import { safeNext } from "@/lib/site";
import { TrackView } from "@/components/TrackView";

export const metadata = { title: "Créer un compte · Vocaly" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/onboarding");
  return (
    <>
      <TrackView event="signup_view" />
      <ol className="mb-5 flex gap-2 text-xs font-medium">
        <li className="rounded-full bg-brand px-3 py-1 text-sur-brand">1. Votre compte</li>
        <li className="rounded-full bg-perle px-3 py-1 text-gris">2. Votre agent</li>
        <li className="rounded-full bg-perle px-3 py-1 text-gris">3. Le test</li>
      </ol>
      <h1 className="text-2xl font-bold text-noir">Créez votre compte</h1>
      <p className="mt-1 mb-6 text-gris">Ensuite, une dizaine de questions rapides et votre agent est prêt à tester.</p>
      <AuthForm
        action={signUp}
        hidden={{ next }}
        submit="Créer mon compte"
        fields={[
          { name: "fullName", label: "Votre nom", autoComplete: "name" },
          { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Mot de passe (8 caractères minimum)", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-6 text-sm text-gris">
        Déjà un compte ? <Link className="font-semibold text-noir underline" href={`/connexion?next=${encodeURIComponent(next)}`}>Se connecter</Link>
      </p>
      <p className="mt-3 text-xs text-gris">
        En créant un compte, vous acceptez les <Link className="underline" href="/cgu">conditions d&apos;utilisation</Link> et la <Link className="underline" href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </>
  );
}
