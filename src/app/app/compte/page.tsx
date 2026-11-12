import { getWorkspace } from "@/lib/workspace";
import { Card, PageHeader } from "@/components/app/ui";
import { AccountForm } from "./AccountForm";

export default async function AccountPage() {
  const { supabase, business, user } = await getWorkspace();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const init: Record<string, string> = {
    full_name: profile?.full_name ?? "",
    name: business.name, description: business.description ?? "", address: business.address ?? "", phone: business.phone ?? "",
    email: business.email ?? "", website_url: business.website_url ?? "", hours: business.hours ?? "", closed_days: business.closed_days ?? "",
  };
  return (
    <div>
      <PageHeader title="Compte" subtitle={user.email ?? undefined} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="mb-4 text-lg font-medium">Entreprise et profil</h2>
          <AccountForm init={init} />
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-medium">Abonnement</h2>
            <p className="mt-2 text-sm text-gris">Offre avant-première : l&apos;activation et la facturation se font avec l&apos;équipe Vocaly, par Mobile Money.</p>
          </Card>
          <Card>
            <form action="/auth/deconnexion" method="post">
              <button className="text-sm font-semibold underline">Se déconnecter</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
