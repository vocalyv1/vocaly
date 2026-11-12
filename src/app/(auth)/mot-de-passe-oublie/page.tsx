import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { requestReset } from "../actions";

export const metadata = { title: "Mot de passe oublié · Vocaly" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-noir">Mot de passe oublié</h1>
      <p className="mt-1 mb-6 text-gris">Nous vous envoyons un lien pour en choisir un nouveau.</p>
      <AuthForm action={requestReset} submit="Envoyer le lien" fields={[{ name: "email", label: "E-mail", type: "email", autoComplete: "email" }]} />
      <p className="mt-6 text-sm text-gris"><Link className="underline" href="/connexion">Retour à la connexion</Link></p>
    </>
  );
}
