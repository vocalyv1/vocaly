import Link from "next/link";
import { AgentSettingsSchema, type AgentSettings } from "@/lib/agent/schema";
import { getWorkspace } from "@/lib/workspace";
import { Card, Empty, Notice, PageHeader, formatDate } from "@/components/app/ui";
import { AgentForm } from "./AgentForm";
import { PublishBar } from "./PublishBar";
import { TestWidget } from "./TestWidget";
import { ActivatePanel } from "./ActivatePanel";
import { earlyBirdFor, isActive, type Subscription } from "@/lib/billing/subscription";
import { EARLY_BIRD, formatFcfa, planPrice } from "@/lib/billing/plans";

export default async function AgentPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string; tester?: string }> }) {
  const { agent, business, supabase } = await getWorkspace();
  const { bienvenue, tester } = await searchParams;
  const focusTest = Boolean(bienvenue || tester);
  if (!agent) return <Empty title="Aucun agent" text="Votre agent n'a pas encore été créé." href="/onboarding" cta="Créer mon agent" />;

  const raw = {
    name: agent.name,
    voice_id: agent.voice_id,
    tone: ["warm", "formal", "direct", "dynamic", "professional"].includes(agent.tone) ? agent.tone : "warm",
    greeting: agent.greeting,
    speaks_first: agent.speaks_first,
    instructions: agent.instructions,
    missions: agent.missions ?? "",
    forbidden: agent.forbidden ?? "",
    unknown_behavior: agent.unknown_behavior,
    unhappy_behavior: agent.unhappy_behavior ?? "",
    max_call_seconds: agent.max_call_seconds,
    transfer_rules: agent.transfer_rules ?? [],
  };
  // Données anciennes ou incomplètes : on les affiche telles quelles, la validation se fait à l'enregistrement.
  const parsed = AgentSettingsSchema.safeParse(raw);
  const initial = parsed.success ? parsed.data : (raw as AgentSettings);
  const { data: subRow } = await supabase.from("subscriptions").select("*").eq("business_id", business.id).maybeSingle();
  const sub = (subRow ?? null) as Subscription | null;
  const active = isActive(sub);
  let paywall: React.ReactNode = null;
  if (!active) {
    const [{ count }, early] = await Promise.all([
      supabase.from("calls").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_test", true),
      earlyBirdFor(sub),
    ]);
    paywall = (
      <ActivatePanel agentName={agent.name} testCalls={count ?? 0}
        fromPrice={formatFcfa(Math.round(planPrice("essentiel", "yearly", early.eligible) / 12))}
        early={early.eligible ? { left: early.left, discount: EARLY_BIRD.discount } : null} />
    );
  }
  const hasChanges = !agent.published_at || new Date(agent.updated_at) > new Date(agent.published_at);

  return (
    <div>
      <PageHeader title={`Mon agent : ${agent.name}`} subtitle={`L'assistant téléphonique de ${business.name}.`} />
      {focusTest && (
        <Card className="mb-6 scroll-mt-24 border-2 border-noir">
          <h2 id="tester" className="text-2xl font-semibold">{bienvenue ? `${agent.name} est prêt : parlez-lui maintenant` : `Parlez à ${agent.name}`}</h2>
          <p className="mb-4 mt-1 text-sm text-gris">Jouez le rôle d&apos;un client : demandez vos horaires, vos prix, un rendez-vous. Vous pourrez corriger ses réglages juste en dessous.</p>
          <TestWidget agentId={agent.provider_test_agent_id} autoPrepare />
        </Card>
      )}
      <div className={`mb-6 grid gap-4 ${focusTest ? "" : "md:grid-cols-2"}`}>
        <Card>
          <h2 className="text-lg font-medium">Publication</h2>
          <p className="mt-1 text-sm text-gris">
            {agent.published_version === 0
              ? "Pas encore publié. Les modifications restent un brouillon tant que vous ne publiez pas."
              : `Version ${agent.published_version} en ligne depuis le ${formatDate(agent.published_at, business.timezone)}.`}
            {agent.published_version > 0 && hasChanges && " Le brouillon contient des modifications non publiées."}
          </p>
          <div className="mt-4"><PublishBar hasChanges={hasChanges} version={agent.published_version} /></div>
          {agent.sync_error && <div className="mt-3"><Notice tone="error">{agent.sync_error}</Notice></div>}
          <p className="mt-4 text-xs text-gris">
            L&apos;agent publié répond aux appels une fois votre numéro connecté (<Link href="/app/telephone" className="underline">Téléphone</Link>).
          </p>
        </Card>
        {!focusTest && (
          <Card className="scroll-mt-24">
            <h2 id="tester" className="mb-1 text-lg font-medium">Tester le brouillon</h2>
            <TestWidget agentId={agent.provider_test_agent_id} />
          </Card>
        )}
      </div>
      {paywall}
      <p className="mb-4 text-sm text-gris">
        Ce que l&apos;agent sait de votre entreprise (FAQ, documents, site) se gère dans{" "}
        <Link href="/app/agent/connaissances" className="font-semibold underline">Connaissances</Link>.
      </p>
      <AgentForm initial={initial} />
    </div>
  );
}
