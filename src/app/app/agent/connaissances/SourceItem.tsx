"use client";

import { useState, useTransition } from "react";
import { CATEGORY_LABELS, KIND_LABELS, KSTATUS } from "@/lib/knowledge";
import { Button, Notice } from "@/components/app/ui";
import { deleteKnowledge, updateKnowledge } from "./actions";

type Source = {
  id: string; kind: string; title: string; content: string; source_ref: string | null; category: string; status: string; error: string | null; size_bytes: number | null;
};

export function SourceItem({ source: s }: { source: Source }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(s.title);
  const [content, setContent] = useState(s.content);
  const [msg, setMsg] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [pending, start] = useTransition();
  const editable = s.kind === "text" || s.kind === "faq";
  const statusCls = s.status === "ready" ? "text-traite" : s.status === "error" ? "text-red-600" : "text-gris";

  return (
    <div className="rounded-2xl border border-ligne bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-perle px-2 py-0.5 font-semibold">{KIND_LABELS[s.kind] ?? s.kind}</span>
        {s.kind !== "faq" && <span className="text-gris">{CATEGORY_LABELS[s.category] ?? s.category}</span>}
        <span className={`ml-auto font-semibold ${statusCls}`}>{KSTATUS[s.status] ?? s.status}</span>
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input min-h-28" value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex gap-2">
            <Button disabled={pending} onClick={() => start(async () => { const r = await updateKnowledge(s.id, title, content); setMsg(r); if (r.ok) setEditing(false); })}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 font-semibold">{s.title}</p>
          {s.kind === "url" && s.source_ref && <a href={s.source_ref} target="_blank" rel="noreferrer" className="text-sm text-gris underline">{s.source_ref}</a>}
          {s.kind === "file" && s.size_bytes && <p className="text-sm text-gris">{Math.round(s.size_bytes / 1024)} Ko</p>}
          {editable && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-gris">{s.content}</p>}
        </>
      )}
      {s.error && <p className="mt-2 text-xs text-red-600">{s.error}</p>}
      {!editing && (
        <div className="mt-3 flex gap-3 text-sm">
          {editable && <button className="text-gris hover:text-noir" onClick={() => setEditing(true)}>Modifier</button>}
          <button className="text-gris hover:text-red-600" disabled={pending} onClick={() => { if (confirm("Supprimer cette connaissance ?")) start(async () => setMsg(await deleteKnowledge(s.id))); }}>
            Supprimer
          </button>
        </div>
      )}
      {msg?.message && <div className="mt-2"><Notice tone={msg.ok ? "ok" : "error"}>{msg.message}</Notice></div>}
    </div>
  );
}
