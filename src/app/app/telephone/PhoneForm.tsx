"use client";

import { useActionState } from "react";
import { Button, Field, Notice } from "@/components/app/ui";
import { requestPhone } from "./actions";

export function PhoneForm() {
  const [state, action, pending] = useActionState<{ ok?: boolean; message?: string }, FormData>(requestPhone, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Numéro de votre entreprise"><input name="current_number" className="input" inputMode="tel" placeholder="06 123 45 67" required /></Field>
        <Field label="Opérateur (facultatif)"><input name="operator" className="input" placeholder="Airtel, MTN, fixe…" /></Field>
      </div>
      <Field label="Précisions (facultatif)"><textarea name="notes" className="input min-h-20" placeholder="Heures où l'agent doit répondre, contraintes…" /></Field>
      <Button type="submit" disabled={pending}>{pending ? "Envoi…" : "Relier ce numéro à mon agent"}</Button>
      {state.message && <Notice tone={state.ok ? "ok" : "error"}>{state.message}</Notice>}
    </form>
  );
}
