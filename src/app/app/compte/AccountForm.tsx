"use client";

import { useActionState } from "react";
import { Button, Field, Notice } from "@/components/app/ui";
import { saveAccount } from "./actions";

type Init = Record<string, string>;

export function AccountForm({ init }: { init: Init }) {
  const [state, action, pending] = useActionState<{ ok?: boolean; message?: string }, FormData>(saveAccount, {});
  const f = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <Field label={label} hint={hint}><input name={name} defaultValue={init[name] ?? ""} className="input" {...props} /></Field>
  );
  return (
    <form action={action} className="space-y-4">
      {f("full_name", "Votre nom")}
      <hr className="border-ligne" />
      {f("name", "Nom de l'entreprise")}
      <Field label="Activité" hint="Ce que fait l'entreprise, en quelques phrases. L'agent s'en sert pour se présenter.">
        <textarea name="description" defaultValue={init.description ?? ""} className="input min-h-24" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        {f("address", "Adresse")}
        {f("phone", "Téléphone de l'entreprise", { placeholder: "+242 ..." })}
        {f("email", "E-mail de réception des résumés", { type: "email" }, "Chaque appel y est résumé.")}
        {f("website_url", "Site web", { placeholder: "https://..." })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {f("hours", "Horaires d'ouverture", { placeholder: "Lun-ven 8h-18h, sam 9h-13h" })}
        {f("closed_days", "Jours de fermeture", { placeholder: "Dimanche et jours fériés" })}
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
      {state.message && <Notice tone={state.ok ? "ok" : "error"}>{state.message}</Notice>}
    </form>
  );
}
