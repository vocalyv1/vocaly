import type { QuizAnswers } from "@/lib/quiz";
import { VOICES } from "@/lib/agent/voices";
import { BRAND } from "@/lib/brand";

// Génère une première configuration d'agent à partir du quiz.
// L'utilisateur la corrige ensuite au lieu de partir d'une page blanche.

export type Tag = { name: string; description: string };
export type FaqItem = { q: string; a: string };
export type TransferRule = { when: string; phone: string; label: string };

export type AgentDraft = {
  name: string;
  voiceId: string;
  role: string;
  instructions: string;
  greeting: string;
  speaksFirst: boolean;
  maxCallSeconds: number;
  transferRules: TransferRule[];
  tags: Tag[];
  faq: FaqItem[];
  calendarEnabled: boolean;
};

const SECTOR_LABEL: Record<string, string> = {
  sante: "établissement de santé",
  education: "établissement d'enseignement",
  hotellerie: "établissement d'hôtellerie et de restauration",
  transport: "agence de transport et de voyage",
  immobilier: "agence immobilière",
  beaute: "salon de beauté et de bien-être",
  garage: "garage et service de dépannage",
  commerce: "commerce",
  services: "entreprise de services",
  autre: "entreprise",
};

const REASON_TAGS: Record<string, Tag> = {
  infos: { name: "Information", description: "Question sur les horaires, l'adresse ou les services" },
  prix: { name: "Prix", description: "Demande de tarif" },
  rdv: { name: "Rendez-vous", description: "Prise, modification ou annulation de rendez-vous" },
  reservation: { name: "Réservation", description: "Demande de réservation" },
  commande: { name: "Commande", description: "Passage ou suivi de commande" },
  devis: { name: "Devis", description: "Demande de devis à rappeler" },
  reclamation: { name: "Réclamation", description: "Client mécontent à rappeler en priorité" },
  urgence: { name: "Urgence", description: "Situation urgente" },
  personne: { name: "Demande de contact", description: "Veut parler à une personne précise" },
};

const SECTOR_FAQ: Record<string, string[]> = {
  sante: ["Quels spécialistes consultent et quels jours ?", "Faut-il prendre rendez-vous ?", "Acceptez-vous les assurances ?", "Que faire en cas d'urgence ?"],
  education: ["Quels sont les frais de scolarité ?", "Quels documents faut-il pour l'inscription ?", "Quand commencent les cours ?", "Proposez-vous un transport scolaire ?"],
  hotellerie: ["Avez-vous des chambres disponibles ?", "Quels sont vos tarifs par nuit ?", "Le petit-déjeuner est-il inclus ?", "Proposez-vous un transfert aéroport ?"],
  transport: ["Quels sont les horaires de départ ?", "Combien coûte un billet ?", "Comment réserver une place ?", "Quels bagages sont autorisés ?"],
  immobilier: ["Quels biens sont disponibles ?", "Quel est le loyer ou le prix ?", "Peut-on organiser une visite ?", "Quels documents faut-il pour louer ?"],
  beaute: ["Quels soins proposez-vous ?", "Combien coûte une prestation ?", "Faut-il prendre rendez-vous ?", "Vendez-vous des produits ?"],
  garage: ["Quels services proposez-vous ?", "Combien coûte un diagnostic ?", "Faites-vous du dépannage ?", "En combien de temps la réparation est-elle faite ?"],
  commerce: ["Avez-vous ce produit en stock ?", "Quels sont vos prix ?", "Livrez-vous ?", "Quels moyens de paiement acceptez-vous ?"],
  services: ["Quels services proposez-vous ?", "Comment se passe un premier rendez-vous ?", "Quels sont vos tarifs ?", "Intervenez-vous hors de la ville ?"],
  autre: ["Que proposez-vous ?", "Quels sont vos tarifs ?", "Comment vous contacter ?"],
};

const TONE_TEXT: Record<QuizAnswers["tone"], string> = {
  formal: "Vouvoie toujours l'appelant, reste très poli et formel.",
  warm: "Vouvoie l'appelant, sois chaleureux et souriant, sans familiarité.",
  direct: "Vouvoie l'appelant, va droit au but avec des phrases courtes.",
};

const GOAL_TEXT: Record<QuizAnswers["goal"], string> = {
  answer: "Ton rôle principal est de répondre précisément aux questions des appelants.",
  book: "Ton rôle principal est de prendre des rendez-vous selon les disponibilités de l'agenda.",
  route: "Ton rôle principal est de comprendre le besoin de l'appelant et de l'orienter vers la bonne personne.",
  qualify: "Ton rôle principal est de comprendre le besoin de l'appelant et de recueillir ses coordonnées pour qu'on le rappelle.",
};

const TRANSFER_TEXT: Record<QuizAnswers["transfer"], string> = {
  urgent: "Transfère l'appel uniquement en cas d'urgence.",
  asked: "Transfère l'appel quand l'appelant demande à parler à une personne.",
  unknown: "Transfère l'appel quand tu ne trouves pas la réponse dans tes informations.",
  never: "Ne transfère jamais : prends un message complet (nom, numéro, besoin).",
};

export function generateAgent(a: QuizAnswers): AgentDraft {
  const sectorLabel = SECTOR_LABEL[a.sector] ?? SECTOR_LABEL.autre;
  const needsCalendar = a.goal === "book" || a.callReasons.includes("rdv") || a.callReasons.includes("reservation");
  const agentName = BRAND.agentName;

  const tags: Tag[] = a.callReasons.map((r) => REASON_TAGS[r]).filter(Boolean);
  tags.push({ name: "Prospect", description: "Nouveau client potentiel à relancer" });

  const instructions = [
    `Tu es ${agentName}, l'assistant(e) téléphonique de ${a.businessName}, ${sectorLabel} à ${a.city}.`,
    `Activité : ${a.activity}.`,
    `Horaires d'ouverture : ${a.hours}.`,
    GOAL_TEXT[a.goal],
    TONE_TEXT[a.tone],
    "Parle uniquement en français, avec des phrases courtes adaptées au téléphone.",
    "Réponds uniquement à partir des informations de ta mémoire. Si tu ne sais pas, dis-le et propose de prendre un message ; n'invente jamais un prix, un horaire ou un service.",
    "Avant de raccrocher, vérifie que tu as le nom de l'appelant, son numéro et son besoin.",
    TRANSFER_TEXT[a.transfer],
    needsCalendar ? "Pour un rendez-vous, propose deux créneaux libres de l'agenda, confirme le choix et répète la date et l'heure." : "",
  ].filter(Boolean).join("\n");

  return {
    name: agentName,
    voiceId: VOICES[0].id,
    role: GOAL_TEXT[a.goal].replace("Ton rôle principal est de ", "").replace(/\.$/, ""),
    instructions,
    greeting: `Bonjour, ${a.businessName}, ${agentName} à votre écoute. Je suis un assistant virtuel et cet appel peut être enregistré. Comment puis-je vous aider ?`,
    speaksFirst: true,
    maxCallSeconds: a.callsPerDay === "gt100" ? 240 : 360,
    transferRules: a.transfer === "never" ? [] : [{ when: TRANSFER_TEXT[a.transfer], phone: "", label: "Accueil" }],
    tags,
    faq: (SECTOR_FAQ[a.sector] ?? SECTOR_FAQ.autre).map((q) => ({ q, a: "" })),
    calendarEnabled: needsCalendar,
  };
}
