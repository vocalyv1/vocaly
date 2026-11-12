"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/knowledge";
import { Button, Field, Notice } from "@/components/app/ui";
import { addKnowledge, type KState } from "./actions";

const TABS = [
  { kind: "faq", label: "Question" },
  { kind: "text", label: "Texte" },
  { kind: "file", label: "Document" },
  { kind: "url", label: "Site web" },
] as const;

export function AddKnowledge() {
  const [kind, setKind] = useState<(typeof TABS)[number]["kind"]>("faq");
  const [state, action, pending] = useActionState<KState, FormData>(addKnowledge, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) form.current?.reset(); }, [state]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-perle p-1">
        {TABS.map((t) => (
          <button key={t.kind} type="button" onClick={() => setKind(t.kind)} className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${kind === t.kind ? "bg-surface text-noir shadow-sm" : "text-gris"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <form ref={form} action={action} className="space-y-3">
        <input type="hidden" name="kind" value={kind} />
        {kind === "faq" && (
          <>
            <Field label="Question d'un client"><input name="title" className="input" placeholder="Livrez-vous à Pointe-Noire ?" /></Field>
            <Field label="Réponse de l'agent"><textarea name="content" className="input min-h-28" placeholder="Oui, sous 48 h, frais de 3 000 FCFA." /></Field>
          </>
        )}
        {kind === "text" && (
          <>
            <Field label="Titre"><input name="title" className="input" placeholder="Nos tarifs 2026" /></Field>
            <Field label="Contenu"><textarea name="content" className="input min-h-40" /></Field>
          </>
        )}
        {kind === "file" && (
          <>
            <Field label="Document" hint="PDF, Word ou texte, 4 Mo maximum."><input name="file" type="file" accept=".pdf,.docx,.txt,.md" className="input" /></Field>
            <Field label="Titre (facultatif)"><input name="title" className="input" /></Field>
          </>
        )}
        {kind === "url" && (
          <>
            <Field label="Adresse de la page" hint="L'agent lit le contenu de cette page."><input name="url" type="url" className="input" placeholder="https://..." /></Field>
            <Field label="Titre (facultatif)"><input name="title" className="input" /></Field>
          </>
        )}
        {kind !== "faq" && (
          <Field label="Catégorie">
            <select name="category" className="input" defaultValue="general">
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </Field>
        )}
        <Button type="submit" disabled={pending}>{pending ? "Ajout…" : "Ajouter"}</Button>
        {state.message && <Notice tone={state.ok ? "ok" : "error"}>{state.message}</Notice>}
      </form>
    </div>
  );
}
