// Messages d'erreur Supabase traduits pour l'utilisateur.
export function authErrorMessage(message?: string) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirmez d'abord votre adresse e-mail : le lien vous a été envoyé.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
  if (m.includes("password") && m.includes("at least")) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (m.includes("same password")) return "Choisissez un mot de passe différent de l'ancien.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}
