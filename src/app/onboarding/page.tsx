import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { Quiz } from "./Quiz";

export const metadata = { title: "Créer votre agent · Vocaly" };
export const dynamic = "force-dynamic";

// Le compte est créé avant le quiz (le middleware renvoie vers l'inscription). Un compte qui a déjà son agent va dans l'espace client.
export default async function OnboardingPage() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) redirect("/inscription?next=/onboarding");
    const { data: members } = await supabase.from("business_members").select("business_id").eq("user_id", auth.user.id);
    const ids = (members ?? []).map((m) => m.business_id);
    if (ids.length) {
      const { count } = await supabase.from("agents").select("id", { count: "exact", head: true }).in("business_id", ids);
      if (count) redirect("/app");
    }
  }
  return <Quiz />;
}
