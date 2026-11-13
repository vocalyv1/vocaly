"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, QUESTIONS, QuizAnswersSchema, SECTORS, type Question } from "@/lib/quiz";
import { generateAgent, type AgentDraft } from "@/lib/agent/generate";
import { VOICES } from "@/lib/agent/voices";
import { BRAND } from "@/lib/brand";
import { track } from "@/lib/funnel/track";

type Answers = Record<string, string | string[]>;

function label(id: string, v: string) {
  const q = QUESTIONS.find((x) => x.id === id);
  return q && q.kind !== "text" ? q.options.find((o) => o.value === v)?.label ?? v : v;
}

export function Quiz() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ callReasons: [], missedWhen: [] });
  const [building, setBuilding] = useState<AgentDraft | null>(null);
  const started = useRef(false);
  const q = QUESTIONS[step];
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100);

  // Nom saisi sur la page d'accueil : la première question est déjà remplie.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let prefilled = false;
    try {
      const name = JSON.parse(localStorage.getItem("vocaly-prefill") ?? "null")?.businessName;
      if (typeof name === "string" && name.trim().length >= 2) {
        setAnswers((a) => ({ ...a, businessName: name.trim().slice(0, 80) }));
        setStep(1);
        prefilled = true;
      }
    } catch {}
    track("quiz_start", { prefilled });
  }, []);

  const canContinue = useMemo(() => isAnswered(q, answers[q.id]), [q, answers]);

  function setValue(value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function next() {
    track("quiz_step", { step: step + 1, id: q.id });
    if (step < QUESTIONS.length - 1) return setStep(step + 1);
    const parsed = QuizAnswersSchema.safeParse(answers);
    if (!parsed.success) return;
    const draft = generateAgent(parsed.data);
    localStorage.setItem("vocaly-onboarding", JSON.stringify({ answers: parsed.data, draft }));
    try { localStorage.removeItem("vocaly-prefill"); } catch {}
    track("quiz_done");
    setBuilding(draft);
  }

  if (building) return <BuildUp draft={building} onDone={() => router.push("/onboarding/agent")} />;

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 h-2 w-full rounded-full bg-ligne">
          <div className="h-2 rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div key={step} className="quiz-step">
          <p className="mb-2 text-sm text-gris">Question {step + 1} sur {QUESTIONS.length}</p>
          <h1 className="mb-2 text-2xl font-semibold text-noir">{q.title}</h1>
          {q.help && <p className="mb-4 text-gris">{q.help}</p>}

          <div className={`mt-4 ${q.kind !== "text" && q.options.length > 10 ? "grid grid-cols-2 gap-2" : "flex flex-col gap-3"}`}>
            {q.kind === "text" ? (
              <input
                autoFocus
                className="rounded-xl border border-ligne px-4 py-3 text-lg outline-none focus:border-brand"
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
                      selected ? "border-brand bg-perle text-noir" : "border-ligne hover:border-brand"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="rounded-xl px-4 py-3 text-gris disabled:opacity-0"
          >
            Retour
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={next}
            className="rounded-xl bg-brand px-6 py-3 font-medium text-sur-brand disabled:opacity-40"
          >
            {step === QUESTIONS.length - 1 ? "Créer mon agent" : "Continuer"}
          </button>
        </div>
      </div>

      <AgentPreview answers={answers} />
    </main>
  );
}

// Aperçu en direct : l'agent se construit à chaque réponse. Rien n'est inventé, ce qui manque est indiqué « Non communiqué ».
function AgentPreview({ answers }: { answers: Answers }) {
  const name = BRAND.agentName;
  const str = (k: string) => (typeof answers[k] === "string" ? (answers[k] as string).trim() : "");
  const business = str("businessName");
  const reasons = (answers.callReasons as string[] | undefined) ?? [];
  const rows: [string, string][] = [
    ["Entreprise", business],
    ["Activité", str("sector") ? SECTORS.find((s) => s.value === str("sector"))?.label ?? "" : ""],
    ["Ville", str("city") ? CITIES.find((c) => c.value === str("city"))?.label ?? str("city") : ""],
    ["Motifs d'appel", reasons.map((r) => label("callReasons", r).split(" (")[0]).join(", ")],
    ["Rôle principal", str("goal") ? label("goal", str("goal")) : ""],
    ["Transfert", str("transfer") ? label("transfer", str("transfer")) : ""],
    ["Ton", str("tone") ? label("tone", str("tone")).split(" (")[0] : ""],
    ["Horaires", str("hours").length >= 3 ? str("hours") : ""],
  ];
  const known = rows.filter(([, v]) => v).length;

  return (
    <aside className="rounded-3xl border border-ligne bg-surface p-5 lg:sticky lg:top-10">
      <div className="flex items-center gap-3">
        <span className="relative grid h-11 w-11 place-items-center rounded-full bg-brand font-semibold text-sur-brand">
          {name[0]}
          <span className="pulse-dot absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-surface bg-traite text-traite" />
        </span>
        <div>
          <p className="font-semibold text-noir">{name}</p>
          <p className="text-xs text-gris">Votre agent prend forme · {known} sur {rows.length} informations</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl rounded-tl-sm bg-perle px-4 py-3 text-sm text-noir">
        {business ? (
          <>« Bonjour, <b key={business} className="flash">{business}</b>, {name} à votre écoute. Comment puis-je vous aider ? »</>
        ) : (
          <span className="text-gris">« Bonjour, [votre entreprise], {name} à votre écoute… »</span>
        )}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between gap-3">
            <span className="shrink-0 text-gris">{k}</span>
            <span key={v} className={`text-right ${v ? "flash font-medium text-noir" : "text-gris/70"}`}>{v || "Non communiqué"}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Montée en puissance à la fin du quiz : chaque ligne décrit ce qui a réellement été préparé pour l'agent.
function BuildUp({ draft, onDone }: { draft: AgentDraft; onDone: () => void }) {
  const voice = VOICES.find((v) => v.id === draft.voiceId)?.label;
  const steps = [
    "Message d'accueil rédigé",
    `Consignes de l'agent écrites (${draft.instructions.split("\n").length} règles)`,
    `${draft.faq.length} questions fréquentes de votre secteur préparées`,
    `${draft.tags.length} étiquettes pour classer vos appels`,
    voice ? `Voix choisie : ${voice}` : "Voix choisie",
  ];
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n < steps.length) { const t = setTimeout(() => setN(n + 1), 550); return () => clearTimeout(t); }
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [n, steps.length, onDone]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-sm text-gris">Création de {draft.name}</p>
      <h1 className="mt-1 text-2xl font-semibold text-noir">{n < steps.length ? "Votre agent se prépare…" : "Votre agent est prêt"}</h1>
      <ul className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 transition-opacity duration-300 ${i < n ? "opacity-100" : "opacity-30"}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${i < n ? "bg-traite text-white" : "border border-ligne"}`}>{i < n ? "✓" : ""}</span>
            <span className="text-noir">{s}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

function isAnswered(q: Question, v: string | string[] | undefined) {
  if (q.kind === "text") return q.optional || (typeof v === "string" && v.trim().length >= 2);
  if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
  return typeof v === "string" && v.length > 0;
}
