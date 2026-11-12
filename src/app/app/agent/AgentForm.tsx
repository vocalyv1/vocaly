"use client";

import { useRef, useState, useTransition } from "react";
import { TONES, UNKNOWN_BEHAVIORS, type AgentSettings } from "@/lib/agent/schema";
import { VOICES } from "@/lib/agent/voices";
import { Button, Card, Field, Notice } from "@/components/app/ui";
import { saveAgentSettings } from "./actions";

export function AgentForm({ initial }: { initial: AgentSettings }) {
  const [s, setS] = useState<AgentSettings>(initial);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const audio = useRef<HTMLAudioElement | null>(null);
  const set = <K extends keyof AgentSettings>(k: K, v: AgentSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  function play(url: string) {
    audio.current?.pause();
    audio.current = new Audio(url);
    audio.current.play().catch(() => {});
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setResult(null);
        start(async () => setResult(await saveAgentSettings(s)));
      }}
      className="space-y-6"
    >
      <Card>
        <h2 className="mb-4 text-lg font-medium">Identité</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom de l'agent" hint="Le nom qu'il donne au téléphone.">
            <input className="input" value={s.name} onChange={(e) => set("name", e.target.value)} maxLength={40} />
          </Field>
          <Field label="Ton">
            <select className="input" value={s.tone} onChange={(e) => set("tone", e.target.value as AgentSettings["tone"])}>
              {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <p className="mb-2 mt-5 text-sm font-semibold">Voix</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {VOICES.map((v) => (
            <div key={v.id} className={`flex items-center justify-between rounded-xl border p-3 ${s.voice_id === v.id ? "border-noir" : "border-ligne"}`}>
              <button type="button" onClick={() => set("voice_id", v.id)} className="text-left">
                <span className="block font-semibold">{v.label}</span>
                <span className="text-xs text-gris">{v.style}</span>
              </button>
              <button type="button" onClick={() => play(v.previewUrl)} className="rounded-full border border-ligne px-3 py-1 text-xs hover:bg-perle" aria-label={`Écouter ${v.label}`}>
                ▶ Écouter
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-medium">Accueil</h2>
        <Field label="Message d'accueil" hint="La première phrase entendue par l'appelant.">
          <textarea className="input min-h-20" value={s.greeting} onChange={(e) => set("greeting", e.target.value)} />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.speaks_first} onChange={(e) => set("speaks_first", e.target.checked)} />
          L&apos;agent parle en premier
        </label>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-medium">Comportement</h2>
        <div className="space-y-4">
          <Field label="Instructions" hint="Ce que fait l'agent, comment il présente l'entreprise, ce qu'il propose.">
            <textarea className="input min-h-56 font-mono text-sm" value={s.instructions} onChange={(e) => set("instructions", e.target.value)} />
          </Field>
          <Field label="Objectifs et informations à recueillir" hint="Ex. : nom, numéro de rappel, motif de l'appel, date souhaitée.">
            <textarea className="input min-h-24" value={s.missions} onChange={(e) => set("missions", e.target.value)} />
          </Field>
          <Field label="Informations à ne jamais donner" hint="Ex. : tarifs négociés, numéro personnel du gérant.">
            <textarea className="input min-h-20" value={s.forbidden} onChange={(e) => set("forbidden", e.target.value)} />
          </Field>
          <Field label="Quand il ne connaît pas la réponse">
            <select className="input" value={s.unknown_behavior} onChange={(e) => set("unknown_behavior", e.target.value as AgentSettings["unknown_behavior"])}>
              {UNKNOWN_BEHAVIORS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Si l'appelant est mécontent">
            <textarea className="input min-h-20" value={s.unhappy_behavior} onChange={(e) => set("unhappy_behavior", e.target.value)} placeholder="Ex. : s'excuser, prendre ses coordonnées et promettre un rappel du responsable dans la journée." />
          </Field>
          <Field label="Durée maximale d'un appel (minutes)">
            <input type="number" className="input max-w-32" min={1} max={30} value={Math.round(s.max_call_seconds / 60)} onChange={(e) => set("max_call_seconds", Math.min(30, Math.max(1, Number(e.target.value) || 1)) * 60)} />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Transferts d&apos;appel</h2>
          {s.transfer_rules.length < 5 && (
            <Button type="button" variant="ghost" onClick={() => set("transfer_rules", [...s.transfer_rules, { label: "", phone: "", when: "" }])}>+ Ajouter</Button>
          )}
        </div>
        {s.transfer_rules.length === 0 && <p className="text-sm text-gris">Aucun transfert. L&apos;agent prendra un message quand un humain est demandé.</p>}
        <div className="space-y-3">
          {s.transfer_rules.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-ligne p-3 md:grid-cols-[1fr_1fr_2fr_auto]">
              <input className="input" placeholder="Qui (ex. Accueil)" value={r.label} onChange={(e) => set("transfer_rules", s.transfer_rules.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className="input" placeholder="+242 06 ..." value={r.phone} onChange={(e) => set("transfer_rules", s.transfer_rules.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
              <input className="input" placeholder="Quand (ex. urgence, demande de devis)" value={r.when} onChange={(e) => set("transfer_rules", s.transfer_rules.map((x, j) => (j === i ? { ...x, when: e.target.value } : x)))} />
              <button type="button" className="text-sm text-gris hover:text-noir" onClick={() => set("transfer_rules", s.transfer_rules.filter((_, j) => j !== i))}>Retirer</button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gris">Le transfert fonctionne une fois votre numéro connecté.</p>
      </Card>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-3xl bg-surface p-3 shadow-sm">
        <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le brouillon"}</Button>
        {result && <div className="flex-1"><Notice tone={result.ok ? "ok" : "error"}>{result.message}</Notice></div>}
      </div>
    </form>
  );
}
