import { getWorkspace } from "@/lib/workspace";
import { Card, Empty, PageHeader } from "@/components/app/ui";
import { AddKnowledge } from "./AddKnowledge";
import { SourceItem } from "./SourceItem";
import { UnansweredQuestions } from "./UnansweredQuestions";

export default async function KnowledgePage() {
  const { supabase, agent, business } = await getWorkspace();
  if (!agent) return <Empty title="Aucun agent" text="Créez d'abord votre agent." href="/onboarding" cta="Créer mon agent" />;
  const { data } = await supabase
    .from("knowledge_sources")
    .select("id, kind, title, content, source_ref, category, status, error, size_bytes, updated_at")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });
  const sources = data ?? [];
  const { data: questions } = await supabase
    .from("unanswered_questions").select("id, question, call_id, created_at")
    .eq("business_id", business.id).eq("status", "open").order("created_at", { ascending: false }).limit(30);
  return (
    <div>
      <PageHeader title="Connaissances" subtitle={`Ce que ${agent.name} sait de votre entreprise. Il ne répond qu'à partir de ces informations et de ses instructions.`} />
      <UnansweredQuestions questions={questions ?? []} agentName={agent.name} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {sources.length === 0 ? (
            <Empty title="Aucune connaissance" text="Ajoutez vos tarifs, services, horaires ou questions fréquentes : votre agent répondra plus juste." />
          ) : (
            sources.map((s) => <SourceItem key={s.id} source={s} />)
          )}
        </div>
        <Card className="h-fit lg:sticky lg:top-6">
          <h2 className="mb-4 text-lg font-medium">Ajouter</h2>
          <AddKnowledge />
        </Card>
      </div>
    </div>
  );
}
