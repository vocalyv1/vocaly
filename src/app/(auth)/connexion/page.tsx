import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { signIn } from "../actions";
import { safeNext } from "@/lib/site";

export const metadata = { title: "Connexion · Vocaly" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <>
      <h1 className="text-2xl font-bold text-noir">Connexion</h1>
      <p className="mt-1 mb-6 text-gris">Retrouvez votre agent et vos appels.</p>
      {sp.erreur === "lien" && (
        <p className="mb-4 rounded-xl bg-perle p-3 text-sm text-noir">Ce lien a expiré ou a déjà servi. Connectez-vous, ou demandez un nouveau lien.</p>
      )}
      <AuthForm
        action={signIn}
        hidden={{ next }}
        submit="Se connecter"
        fields={[
          { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Mot de passe", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="mt-6 grid gap-2 text-sm text-gris">
        <Link className="underline" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        <span>
          Pas encore de compte ? <Link className="font-semibold text-noir underline" href="/onboarding">Créer mon agent</Link>
        </span>
      </div>
    </>
  );
}
