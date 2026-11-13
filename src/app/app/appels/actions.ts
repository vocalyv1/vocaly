"use server";

import { revalidatePath } from "next/cache";
import { processCall } from "@/lib/calls/process";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { getWorkspace } from "@/lib/workspace";

const ALLOWED = ["resolved", "unresolved", "message", "transferred"];

export async function setCallStatus(id: string, status: string) {
  if (!ALLOWED.includes(status)) return;
  const { supabase, user } = await getWorkspace();
  const done = status === "resolved" ? { follow_up_done_at: new Date().toISOString(), follow_up_done_by: user.id } : { follow_up_done_at: null, follow_up_done_by: null };
  await supabase.from("calls").update({ status, ...done }).eq("id", id);
  revalidatePath(`/app/appels/${id}`);
  revalidatePath("/app/appels");
}

// Liste « À rappeler » : l'action demandée par l'appel est faite.
export async function markFollowUpDone(id: string) {
  return setCallStatus(id, "resolved");
}

// Relance l'analyse d'un appel dont le rapport a échoué (après vérification d'appartenance via la RLS).
export async function retryReport(id: string) {
  const { supabase } = await getWorkspace();
  const { data } = await supabase.from("calls").select("id, report_status").eq("id", id).maybeSingle();
  if (!data || data.report_status === "ready") return;
  await createAdminClient().from("calls").update({ report_status: "pending", report_error: null }).eq("id", id);
  await processCall(id, await siteUrl());
  revalidatePath(`/app/appels/${id}`);
}
