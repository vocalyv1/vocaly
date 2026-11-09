"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, QuizAnswersSchema, type Question } from "@/lib/quiz";
import { generateAgent } from "@/lib/agent/generate";

type Answers = Record<string, string | string[]>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ callReasons: [], missedWhen: [] });
  const q = QUESTIONS[step];
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100);

  const canContinue = useMemo(() => isAnswered(q, answers[q.id]), [q, answers]);

  function setValue(value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function next() {
    if (step < QUESTIONS.length - 1) return setStep(step + 1);
    const parsed = QuizAnswersSchema.safeParse(answers);
    if (!parsed.success) return;
    const draft = generateAgent(parsed.data);
    sessionStorage.setItem("onboarding", JSON.stringify({ answers: parsed.data, draft }));
    router.push("/onboarding/agent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-10">
      <div className="mb-8 h-2 w-full rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mb-2 text-sm text-slate-500">Question {step + 1} sur {QUESTIONS.length}</p>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">{q.title}</h1>
      {q.help && <p className="mb-4 text-slate-500">{q.help}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {q.kind === "text" ? (
          <input
            autoFocus
            className="rounded-xl border border-slate-300 px-4 py-3 text-lg outline-none focus:border-emerald-600"
            placeholder={q.placeholder}
            value={(answers[q.id] as string) ?? ""}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canContinue && next()}
          />
        ) : (
          q.options.map((o) => {
            const current = answers[q.id];
            const selected = q.kind === "multi" ? (current as string[] | undefined)?.includes(o.value) : current === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  if (q.kind === "single") return setValue(o.value);
                  const list = new Set((current as string[]) ?? []);
                  if (list.has(o.value)) list.delete(o.value);
                  else list.add(o.value);
                  setValue([...list]);
                }}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selected ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-300 hover:border-slate-400"
                }`}
              >
                {o.label}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="rounded-xl px-4 py-3 text-slate-600 disabled:opacity-0"
        >
          Retour
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={next}
          className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white disabled:opacity-40"
        >
          {step === QUESTIONS.length - 1 ? "Créer mon agent" : "Continuer"}
        </button>
      </div>
    </main>
  );
}

function isAnswered(q: Question, v: string | string[] | undefined) {
  if (q.kind === "text") return q.optional || (typeof v === "string" && v.trim().length >= 2);
  if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
  return typeof v === "string" && v.length > 0;
}
