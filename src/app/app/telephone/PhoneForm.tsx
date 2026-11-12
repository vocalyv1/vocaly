"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice } from "@/components/app/ui";
import { requestPhone } from "./actions";

const MODES = [
  { value: "new_number", title: "Un nouveau numéro", text: "Vocaly vous attribue un numéro dédié. Vous le communiquez à vos clients." },
  { value: "forwarding", title: "Renvoi de mon numéro actuel", text: "Vous gardez votre numéro. Les appels sont renvoyés vers l'agent (tous, ou seulement quand vous ne répondez pas)." },
  { value: "porting", title: "Transfert de mon numéro", text: "Votre numéro est déplacé chez notre opérateur. Démarche plus longue, à faire avec votre opérateur." },
] as const;

export function PhoneForm() {
  const [mode, setMode] = useState<string>("forwarding");
  const [state, action, pending] = useActionState<{ ok?: boolean; message?: string }, FormData>(requestPhone, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-2 md:grid-cols-3">
        {MODES.map((m) => (
          <label key={m.value} className={`cursor-pointer rounded-xl border p-4 ${mode === m.value ? "border-noir" : "border-ligne"}`}>
            <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="sr-only" />
            <span className="block font-semibold">{m.title}</span>
            <span className="mt-1 block text-sm text-gris">{m.text}</span>
          </label>
        ))}
      </div>
      {mode !== "new_number" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Votre numéro actuel"><input name="current_number" className="input" placeholder="+242 06 ..." /></Field>
          <Field label="Opérateur"><input name="operator" className="input" placeholder="MTN, Airtel, fixe…" /></Field>
        </div>
      )}
      <Field label="Précisions (facultatif)"><textarea name="notes" className="input min-h-20" placeholder="Heures où l'agent doit répondre, contraintes…" /></Field>
      <Button type="submit" disabled={pending}>{pending ? "Envoi…" : "Demander la mise en service"}</Button>
      {state.message && <Notice tone={state.ok ? "ok" : "error"}>{state.message}</Notice>}
    </form>
  );
}
