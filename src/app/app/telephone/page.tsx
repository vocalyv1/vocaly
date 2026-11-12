import { getWorkspace } from "@/lib/workspace";
import { Card, Empty, Notice, PageHeader, formatDate } from "@/components/app/ui";
import { PhoneForm } from "./PhoneForm";

const MODE_LABEL: Record<string, string> = { new_number: "nouveau numéro", forwarding: "renvoi d'appel", porting: "transfert de numéro" };

export default async function PhonePage() {
  const { agent, business } = await getWorkspace();
  if (!agent) return <Empty title="Aucun agent" text="Créez d'abord votre agent." href="/onboarding" cta="Créer mon agent" />;
  const req = agent.phone_request ?? {};
  return (
    <div>
      <PageHeader title="Téléphone" subtitle="Le numéro sur lequel votre agent répond." />
      <Card className="mb-6">
        <p className="text-sm text-gris">Statut</p>
        {agent.phone_status === "connected" ? (
          <p className="mt-1 text-xl font-medium text-traite">Connecté{agent.phone_number && ` : ${agent.phone_number}`}</p>
        ) : agent.phone_status === "configuring" ? (
          <>
            <p className="mt-1 text-xl font-medium">Mise en service en cours</p>
            <p className="mt-1 text-sm text-gris">
              Demande de {MODE_LABEL[agent.phone_mode ?? ""] ?? "numéro"} envoyée le {formatDate(req.requested_at, business.timezone)}.
              Le statut passera à « Connecté » uniquement quand l&apos;opérateur aura confirmé la ligne et qu&apos;un appel d&apos;essai aura abouti.
            </p>
          </>
        ) : agent.phone_status === "error" ? (
          <p className="mt-1 text-xl font-medium text-red-600">Problème sur la ligne : l&apos;équipe Vocaly vous contacte.</p>
        ) : agent.phone_status === "disabled" ? (
          <p className="mt-1 text-xl font-medium">Désactivé</p>
        ) : (
          <p className="mt-1 text-xl font-medium">Aucun numéro connecté</p>
        )}
        {agent.phone_status === "connected" && agent.published_version === 0 && (
          <div className="mt-3"><Notice tone="error">Votre agent n&apos;est pas encore publié : publiez-le depuis « Mon agent » pour qu&apos;il réponde.</Notice></div>
        )}
      </Card>
      {(agent.phone_status === "not_configured" || agent.phone_status === "error") && (
        <Card>
          <h2 className="mb-1 text-lg font-medium">Demander un numéro</h2>
          <p className="mb-5 text-sm text-gris">Numéros congolais (+242). La mise en service est faite avec vous par l&apos;équipe Vocaly.</p>
          <PhoneForm />
        </Card>
      )}
    </div>
  );
}
