import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { AddKnowledge } from "@/app/app/agent/connaissances/AddKnowledge";

const KIND_LABEL: Record<string, string> = { faq: "Question", text: "Texte", file: "Document", url: "Site web" };

// Dernière étape de la création : l'agent apprend à partir des documents et du site de l'entreprise.
export default async function OnboardingKnowledgePage() {
  const { supabase, agent } = await getWorkspace();
  const { data } = agent
    ? await supabase.from("knowledge_sources").select("id, kind, title").eq("agent_id", agent.id).neq("kind", "faq").order("created_at", { ascending: false })
    : { data: [] };
  const sources = data ?? [];

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8 h-2 w-full rounded-full bg-ligne"><div className="h-2 w-full rounded-full bg-brand" /></div>
      <p className="mb-2 text-sm text-gris">Dernière étape</p>
      <h1 className="text-2xl font-semibold text-noir">Donnez vos informations à {agent?.name ?? "votre agent"}</h1>
      <p className="mt-2 text-gris">
        Ajoutez le lien de votre site ou vos documents : liste de prix, menu, catalogue, brochure. Votre agent répond uniquement à partir de ces informations.
        Vous pourrez en ajouter d&apos;autres plus tard dans « Connaissances ».
      </p>

      <div className="mt-6 rounded-3xl border border-ligne bg-surface p-5">
        <AddKnowledge initial="url" />
      </div>

      {sources.length > 0 && (
        <ul className="mt-6 space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-xl border border-ligne px-4 py-3 text-sm">
              <span className="truncate font-medium">{s.title}</span>
              <span className="ml-3 shrink-0 text-gris">{KIND_LABEL[s.kind] ?? s.kind}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex justify-end">
        <Link href="/app/agent?bienvenue=1" className="rounded-xl bg-brand px-6 py-3 font-medium text-sur-brand">
          {sources.length > 0 ? "Terminer" : "Passer pour l\u2019instant"}
        </Link>
      </div>
    </main>
  );
}
