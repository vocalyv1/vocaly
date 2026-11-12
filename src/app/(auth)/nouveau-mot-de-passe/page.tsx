import { AuthForm } from "@/components/AuthForm";
import { updatePassword } from "../actions";

export const metadata = { title: "Nouveau mot de passe · Vocaly" };

export default function NewPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-noir">Nouveau mot de passe</h1>
      <p className="mt-1 mb-6 text-gris">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
      <AuthForm
        action={updatePassword}
        submit="Enregistrer"
        fields={[{ name: "password", label: "Nouveau mot de passe", type: "password", autoComplete: "new-password" }]}
      />
    </>
  );
}
