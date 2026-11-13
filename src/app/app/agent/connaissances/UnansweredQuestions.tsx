"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Button, Card, Notice } from "@/components/app/ui";
import { answerQuestion, dismissQuestion, type KState } from "./actions";

type Q = { id: string; question: string; call_id: string | null; created_at: string };

// Questions auxquelles l'agent n'a pas su répondre : une réponse écrite ici devient une connaissance de l'agent.
export function UnansweredQuestions({ questions, agentName }: { questions: Q[]; agentName: string }) {
  if (!questions.length) return null;
  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">Questions sans réponse <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{questions.length}</span></h2>
        <p className="text-sm text-gris">Vos clients ont posé ces questions et {agentName} n&apos;avait pas la réponse.</p>
      </div>
      <ul className="space-y-3">{questions.map((q) => <Item key={q.id} q={q} />)}</ul>
    </Card>
  );
}

function Item({ q }: { q: Q }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<KState, FormData>(answerQuestion, {});
  const [dismissing, start] = useTransition();
  if (state.ok) return <li><Notice tone="ok">Réponse ajoutée. {state.message}</Notice></li>;
  return (
    <li className="rounded-2xl border border-ligne p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-medium">« {q.question} »</p>
        <div className="flex shrink-0 gap-2 text-sm">
          {q.call_id && <Link href={`/app/appels/${q.call_id}`} className="text-gris underline">Voir l&apos;appel</Link>}
          <button type="button" disabled={dismissing} onClick={() => start(() => dismissQuestion(q.id))} className="text-gris hover:text-noir">Ignorer</button>
        </div>
      </div>
      {open ? (
        <form action={action} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={q.id} />
          <textarea name="answer" required autoFocus className="input min-h-20" placeholder="La réponse que l'agent donnera la prochaine fois" />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Ajouter la réponse"}</Button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-gris">Annuler</button>
          </div>
          {state.message && !state.ok && <Notice tone="error">{state.message}</Notice>}
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-sur-brand">Ajouter la réponse</button>
      )}
    </li>
  );
}
