import type { Agent, Business } from "@/lib/workspace";

const TONE_TEXT: Record<string, string> = {
  warm: "chaleureux, souriant et bienveillant",
  formal: "formel, courtois, vouvoiement systématique",
  direct: "direct et concis : des phrases courtes, droit au but",
  dynamic: "dynamique et enthousiaste, sans en faire trop",
  professional: "professionnel, posé et rassurant",
};

const UNKNOWN_TEXT: Record<string, string> = {
  message: "dis-le simplement, puis propose de prendre un message : nom, numéro de rappel et besoin précis",
  transfer: "dis-le simplement, puis transfère l'appel à un collaborateur selon les règles de transfert (si aucun n'est disponible, prends un message)",
  callback: "dis-le simplement, puis propose qu'un membre de l'équipe rappelle le client : demande son nom et son numéro",
};

export type FaqItem = { q: string; a: string };

// Prompt système complet de l'agent, construit à partir des réglages et des infos de l'entreprise.
// Les règles de prudence sont fixes : l'utilisateur ne peut pas les retirer.
export function buildSystemPrompt(business: Business, agent: Agent, faq: FaqItem[]) {
  const lines: string[] = [];
  lines.push(`Tu es ${agent.name}, l'assistant téléphonique de ${business.name}. Tu réponds en français, au téléphone.`);
  lines.push(`Ton : ${TONE_TEXT[agent.tone] ?? TONE_TEXT.warm}.`);

  const info = [
    ["Activité", business.description],
    ["Secteur", business.sector],
    ["Ville", business.city],
    ["Adresse", business.address],
    ["Téléphone", business.phone],
    ["E-mail", business.email],
    ["Site web", business.website_url],
    ["Horaires", business.hours],
    ["Jours de fermeture", business.closed_days],
  ].filter(([, v]) => v && String(v).trim());
  if (info.length) {
    lines.push("\n# L'entreprise");
    for (const [k, v] of info) lines.push(`- ${k} : ${v}`);
  }

  lines.push("\n# Ton rôle et tes instructions");
  lines.push(agent.instructions.trim());
  if (agent.missions?.trim()) lines.push("\n# Objectifs et informations à recueillir\n" + agent.missions.trim());

  if (faq.length) {
    lines.push("\n# Questions fréquentes (réponses validées par l'entreprise)");
    for (const f of faq) lines.push(`Q : ${f.q}\nR : ${f.a}`);
  }

  lines.push("\n# Règles à respecter absolument");
  lines.push("- N'invente jamais une information : prix, disponibilité, délai, horaire, nom, adresse. Si l'information n'est ni ci-dessus ni dans la base de connaissances, " + (UNKNOWN_TEXT[agent.unknown_behavior] ?? UNKNOWN_TEXT.message) + ".");
  lines.push("- Ne confirme jamais un rendez-vous, une réservation ou une commande : tu notes la demande (date et heure souhaitées, nom, numéro) et tu précises que l'équipe la confirmera.");
  lines.push("- Ne donne aucun avis médical, juridique ou financier personnalisé.");
  lines.push("- Tu ne parles que français. Si l'appelant parle une autre langue, dis poliment en français que tu ne parles que français et propose de noter son nom et son numéro pour que l'équipe le rappelle.");
  lines.push("- Avant de raccrocher, reformule en une phrase ce que tu as noté et ce qui va se passer ensuite.");
  lines.push("- Si l'appelant demande à parler à un humain, propose le transfert s'il est possible, sinon prends un message.");
  lines.push("- Parle naturellement, une ou deux phrases à la fois, et laisse l'appelant répondre. Épelle les numéros chiffre par chiffre pour les confirmer.");
  if (agent.forbidden?.trim()) lines.push("- Informations que tu ne dois jamais communiquer : " + agent.forbidden.trim());
  if (agent.unhappy_behavior?.trim()) lines.push("- Si l'appelant est mécontent : " + agent.unhappy_behavior.trim());
  if (agent.transfer_rules.length) {
    lines.push("\n# Transferts possibles");
    for (const r of agent.transfer_rules) lines.push(`- ${r.label || "Collaborateur"} : ${r.when || "sur demande de l'appelant"}`);
  }
  return lines.join("\n");
}
