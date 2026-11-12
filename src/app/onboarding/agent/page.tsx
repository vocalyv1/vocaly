"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentDraft } from "@/lib/agent/generate";
import { VOICES } from "@/lib/agent/voices";
import { BRAND } from "@/lib/brand";

// Écran « l'utilisateur corrige au lieu d'écrire » : tout est pré-rempli par le quiz.
export default function AgentReviewPage() {
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("vocaly-onboarding");
    if (raw) setDraft(JSON.parse(raw).draft);
  }, []);

  if (!draft) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <p>Aucun agent en cours. <a className="text-brand underline" href="/onboarding">Commencer le quiz</a></p>
      </main>
    );
  }

  const set = <K extends keyof AgentDraft>(k: K, v: AgentDraft[K]) => setDraft({ ...draft, [k]: v });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-noir">Votre agent est prêt</h1>
      <p className="mt-1 text-gris">Relisez et corrigez si besoin. Vous ajouterez ses connaissances juste après.</p>

      <section className="mt-8 grid gap-6">
        <Field label="Nom de l'agent">
          <input className="input disabled:bg-perle disabled:text-gris" disabled={BRAND.lockAgentName} value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>

        <Field label="Voix">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => set("voiceId", v.id)}
                className={`rounded-xl border px-3 py-2 text-left ${draft.voiceId === v.id ? "border-brand bg-perle" : "border-ligne"}`}
              >
                <div className="font-medium">{v.label}</div>
                <div className="text-xs text-gris">{v.style}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Message d'accueil">
          <textarea className="input min-h-24" value={draft.greeting} onChange={(e) => set("greeting", e.target.value)} />
        </Field>

        <Field label="Qui parle en premier ?">
          <select className="input" value={draft.speaksFirst ? "agent" : "caller"} onChange={(e) => set("speaksFirst", e.target.value === "agent")}>
            <option value="agent">L&apos;agent décroche et salue</option>
            <option value="caller">L&apos;agent attend que l&apos;appelant parle</option>
          </select>
        </Field>

        <Field label="Instructions">
          <textarea className="input min-h-56 font-mono text-sm" value={draft.instructions} onChange={(e) => set("instructions", e.target.value)} />
        </Field>

        <Field label="Durée maximale d'un appel (minutes)">
          <input
            type="number" min={1} max={30} className="input"
            value={Math.round(draft.maxCallSeconds / 60)}
            onChange={(e) => set("maxCallSeconds", Number(e.target.value) * 60)}
          />
        </Field>

        <Field label="Tags pour classer les appels">
          <div className="flex flex-wrap gap-2">
            {draft.tags.map((t, i) => (
              <span key={i} className="rounded-full bg-perle px-3 py-1 text-sm" title={t.description}>{t.name}</span>
            ))}
          </div>
        </Field>

        <Field label="FAQ de départ (complétez les réponses)">
          <div className="grid gap-3">
            {draft.faq.map((f, i) => (
              <div key={i} className="rounded-xl border border-ligne p-3">
                <div className="mb-2 text-sm font-medium">{f.q}</div>
                <input
                  className="input" placeholder="Votre réponse"
                  value={f.a}
                  onChange={(e) => set("faq", draft.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                />
              </div>
            ))}
          </div>
        </Field>
      </section>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={() => {
            const raw = JSON.parse(localStorage.getItem("vocaly-onboarding") ?? "{}");
            localStorage.setItem("vocaly-onboarding", JSON.stringify({ ...raw, draft }));
            router.push("/onboarding/enregistrer");
          }}
          className="rounded-xl bg-brand px-6 py-3 font-medium text-sur-brand"
        >
          Enregistrer mon agent
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-noir">{label}</span>
      {children}
    </label>
  );
}
