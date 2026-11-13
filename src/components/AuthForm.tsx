"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { OtpVerify } from "./OtpVerify";

type Field = { name: string; label: string; type?: string; autoComplete?: string; placeholder?: string };

// Formulaire d'authentification générique : champs, message d'erreur ou d'information, bouton.
export function AuthForm({
  action,
  fields,
  submit,
  hidden = {},
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  if (state.otp) return <OtpVerify {...state.otp} />;
  if (state.info) {
    return <p className="rounded-xl bg-perle p-4 text-noir" role="status">{state.info}</p>;
  }
  return (
    <form action={formAction} className="grid gap-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1.5 text-sm font-medium text-noir">
          {f.label}
          <input
            className="input"
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            required
          />
        </label>
      ))}
      {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      <button disabled={pending} className="mt-2 rounded-xl bg-brand px-5 py-3 font-semibold text-sur-brand disabled:opacity-60">
        {pending ? "Un instant…" : submit}
      </button>
    </form>
  );
}
