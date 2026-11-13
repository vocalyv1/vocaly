"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { safeNext, siteUrl } from "@/lib/site";
import { authErrorMessage } from "@/lib/auth/messages";

export type OtpKind = "signup" | "recovery";
export type FormState = { error?: string; info?: string; otp?: { email: string; kind: OtpKind; next: string } };

const NOT_READY: FormState = { error: "Les comptes ne sont pas encore activés sur ce site. Réessayez bientôt." };

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfigured) return NOT_READY;
  const fullName = String(form.get("fullName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"), "/onboarding/enregistrer");
  if (fullName.length < 2) return { error: "Indiquez votre nom." };
  if (!email.includes("@")) return { error: "Indiquez une adresse e-mail valide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: authErrorMessage(error.message) };
  if (data.session) redirect(next);
  return { otp: { email, kind: "signup", next } };
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfigured) return NOT_READY;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && error.message.toLowerCase().includes("email not confirmed")) {
    await supabase.auth.resend({ type: "signup", email });
    return { otp: { email, kind: "signup", next: safeNext(form.get("next")) } };
  }
  if (error) return { error: authErrorMessage(error.message) };
  redirect(safeNext(form.get("next")));
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfigured) return NOT_READY;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Indiquez une adresse e-mail valide." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/nouveau-mot-de-passe`,
  });
  // Même réponse que le compte existe ou non (ne révèle pas les e-mails inscrits).
  return { otp: { email, kind: "recovery", next: "/nouveau-mot-de-passe" } };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfigured) return NOT_READY;
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error.message) };
  redirect("/app");
}

// Vérifie le code reçu par e-mail (inscription ou mot de passe oublié) et ouvre la session.
export async function verifyCode(email: string, token: string, kind: OtpKind): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured) return { ok: false, error: NOT_READY.error };
  const clean = token.replace(/\D/g, "");
  if (!email.includes("@") || clean.length < 6 || clean.length > 10) return { ok: false, error: "Code incomplet." };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: clean, type: kind === "signup" ? "signup" : "recovery" });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("expired") || m.includes("invalid")) return { ok: false, error: "Code incorrect ou expiré." };
    return { ok: false, error: authErrorMessage(error.message) };
  }
  return { ok: true };
}

export async function resendCode(email: string, kind: OtpKind): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigured) return { ok: false, error: NOT_READY.error };
  const supabase = await createClient();
  const { error } = kind === "signup"
    ? await supabase.auth.resend({ type: "signup", email })
    : await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await siteUrl()}/auth/callback?next=/nouveau-mot-de-passe` });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  return { ok: true };
}
