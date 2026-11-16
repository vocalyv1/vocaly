import { getWorkspace } from "@/lib/workspace";
import { Card, Empty, Notice, PageHeader, formatDate } from "@/components/app/ui";
import { PhoneForm } from "./PhoneForm";
import Link from "next/link";
import { isActive } from "@/lib/billing/subscription";
import { formatCongo } from "@/lib/phone/number";
import { routingNumber } from "@/lib/phone/routing";

export default async function PhonePage() {
  const { agent, business, supabase } = await getWorkspace();
  if (!agent) return <Empty title="Aucun agent" text="Créez d'abord votre agent." href="/onboarding" cta="Créer mon agent" />;
  const req = agent.phone_request ?? {};
  const { data: sub } = await supabase.from("subscriptions").select("status, paid_until").eq("business_id", business.id).maybeSingle();
  const subscribed = isActive(sub);
  const { data: route } = agent.phone_number
    ? await supabase.from("phone_routes").select("provider_phone_number_id").eq("number", agent.phone_number).maybeSingle()
    : { data: null };
  const vocalyNumber = routingNumber();
  const ready = Boolean(route?.provider_phone_number_id && vocalyNumber);
  const dial = vocalyNumber ? `**21*${vocalyNumber.replace("+242", "")}#` : "";
  return (
    <div>
      <PageHeader title="Téléphone" subtitle="Vous gardez votre numéro : ses appels sont renvoyés vers votre agent." />
      <Card className="mb-6">
        <p className="text-sm text-gris">Statut</p>
        {agent.phone_status === "connected" ? (
          <p className="mt-1 text-xl font-medium text-traite">Connecté{agent.phone_number && ` : ${formatCongo(agent.phone_number)}`}</p>
        ) : agent.phone_status === "configuring" ? (
          <>
            <p className="mt-1 text-xl font-medium">Mise en service en cours{agent.phone_number && ` : ${formatCongo(agent.phone_number)}`}</p>
            {ready ? (
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm">
                <li>
                  Sur le téléphone de l&apos;entreprise ({formatCongo(agent.phone_number)}), composez{" "}
                  <span className="rounded bg-perle px-2 py-0.5 font-mono font-semibold">{dial}</span> puis appuyez sur Appeler.
                  Tous les appels de ce numéro seront renvoyés vers votre agent, sans que votre téléphone sonne.
                </li>
                <li>Depuis un autre téléphone, appelez {formatCongo(agent.phone_number)}. Votre agent doit décrocher.</li>
                <li>Le statut passera à « Connecté » dès que votre agent aura répondu à ce premier appel.</li>
              </ol>
            ) : (
              <p className="mt-1 text-sm text-gris">
                Demande envoyée le {formatDate(req.requested_at, business.timezone)}. L&apos;équipe Vocaly finalise la liaison et vous contacte.
                Le statut passera à « Connecté » uniquement après un premier appel réussi.
              </p>
            )}
          </>
        ) : agent.phone_status === "error" ? (
          <p className="mt-1 text-xl font-medium text-red-600">Problème sur la ligne : l&apos;équipe Vocaly vous contacte.</p>
        ) : agent.phone_status === "disabled" ? (
          <p className="mt-1 text-xl font-medium">Désactivé</p>
        ) : (
          <p className="mt-1 text-xl font-medium">Aucun numéro connecté</p>
        )}
        {(agent.phone_status === "connected" || agent.phone_status === "configuring") && dial && (
          <p className="mt-4 text-xs text-gris">Pour désactiver le renvoi : composez <span className="font-mono">##21#</span> sur le téléphone de l&apos;entreprise. Le renvoi est souvent facturé par votre opérateur : renseignez-vous auprès de lui.</p>
        )}
        {agent.phone_status === "connected" && agent.published_version === 0 && (
          <div className="mt-3"><Notice tone="error">Votre agent n&apos;est pas encore publié : publiez-le depuis « Mon agent » pour qu&apos;il réponde.</Notice></div>
        )}
      </Card>
      {(agent.phone_status === "not_configured" || agent.phone_status === "error") && (
        <Card>
          <h2 className="mb-1 text-lg font-medium">Relier mon numéro</h2>
          <p className="mb-5 text-sm text-gris">Indiquez le numéro que vos clients appellent déjà. Vous le gardez : nous le relions à votre agent, puis vous activez le renvoi d&apos;appel.</p>
          {subscribed ? (
            <PhoneForm />
          ) : (
            <Notice>
              La mise en service d&apos;un numéro demande une offre active. Vous pouvez tester votre agent gratuitement dans le navigateur avant de payer.{" "}
              <Link href="/app/abonnement" className="font-semibold underline">Choisir mon offre</Link>
            </Notice>
          )}
        </Card>
      )}
    </div>
  );
}
