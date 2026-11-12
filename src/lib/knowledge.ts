export const CATEGORIES = ["general", "tarifs", "services", "horaires", "procedures", "politiques"] as const;
export const CATEGORY_LABELS: Record<string, string> = {
  general: "Général", tarifs: "Tarifs", services: "Services", horaires: "Horaires et accès", procedures: "Procédures", politiques: "Conditions et politiques", faq: "FAQ",
};
export const KIND_LABELS: Record<string, string> = { text: "Texte", faq: "FAQ", file: "Document", url: "Site web" };
export const KSTATUS: Record<string, string> = { pending: "En attente d'indexation", indexing: "Indexation…", ready: "Prêt", error: "Erreur" };
