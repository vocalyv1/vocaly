import { z } from "zod";

// Quiz d'onboarding : réponses à choix unique ou multiple, plus quelques champs libres courts.
// Chaque réponse sert à générer l'agent (voir lib/agent/generate.ts).

export type Option = { value: string; label: string };

export type Question =
  | { id: string; kind: "single" | "multi"; title: string; help?: string; options: Option[] }
  | { id: string; kind: "text"; title: string; help?: string; placeholder: string; optional?: boolean };

export const SECTORS: Option[] = [
  { value: "sante", label: "Santé (clinique, cabinet, pharmacie)" },
  { value: "education", label: "Éducation (école, centre de formation)" },
  { value: "hotellerie", label: "Hôtel, résidence, restaurant" },
  { value: "transport", label: "Transport, agence de voyage" },
  { value: "immobilier", label: "Immobilier, location" },
  { value: "beaute", label: "Beauté, coiffure, bien-être" },
  { value: "garage", label: "Garage, artisan, dépannage" },
  { value: "commerce", label: "Commerce, boutique, distribution" },
  { value: "services", label: "Services aux entreprises, cabinet, agence" },
  { value: "autre", label: "Autre activité" },
];

// Villes du Congo-Brazzaville (chefs-lieux de département et principales villes).
export const CITIES: Option[] = [
  "Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi", "Ouesso", "Owando", "Oyo", "Impfondo", "Madingou", "Sibiti",
  "Kinkala", "Djambala", "Ewo", "Mossendjo", "Gamboma", "Mossaka", "Makoua", "Kintélé", "Loutété", "Mouyondzi",
].map((c) => ({ value: c, label: c }));

export const QUESTIONS: Question[] = [
  { id: "businessName", kind: "text", title: "Comment s'appelle votre entreprise ?", placeholder: "Ex. Clinique Les Palmiers" },
  { id: "sector", kind: "single", title: "Quelle est votre activité ?", options: SECTORS },
  { id: "activity", kind: "text", title: "Décrivez votre activité en une phrase", placeholder: "Ex. Clinique privée avec 6 spécialistes à Brazzaville" },
  { id: "city", kind: "single", title: "Dans quelle ville êtes-vous ?", options: CITIES },
  {
    id: "callsPerDay", kind: "single", title: "Combien d'appels recevez-vous par jour ?",
    options: [
      { value: "lt10", label: "Moins de 10" },
      { value: "10-30", label: "10 à 30" },
      { value: "30-100", label: "30 à 100" },
      { value: "gt100", label: "Plus de 100" },
    ],
  },
  {
    id: "callReasons", kind: "multi", title: "Pourquoi vos clients appellent-ils ?", help: "Plusieurs choix possibles",
    options: [
      { value: "infos", label: "Demander des informations (horaires, adresse, services)" },
      { value: "prix", label: "Connaître les prix" },
      { value: "rdv", label: "Prendre ou modifier un rendez-vous" },
      { value: "reservation", label: "Réserver (chambre, table, place)" },
      { value: "commande", label: "Passer ou suivre une commande" },
      { value: "devis", label: "Demander un devis" },
      { value: "reclamation", label: "Faire une réclamation" },
      { value: "urgence", label: "Signaler une urgence" },
      { value: "personne", label: "Parler à une personne précise" },
    ],
  },
  {
    id: "missedWhen", kind: "multi", title: "Quand ratez-vous le plus d'appels ?",
    options: [
      { value: "busy", label: "Quand on est occupés avec un client" },
      { value: "night", label: "Le soir et la nuit" },
      { value: "weekend", label: "Le week-end" },
      { value: "rush", label: "Aux heures de pointe" },
      { value: "none", label: "On en rate rarement" },
    ],
  },
  {
    id: "goal", kind: "single", title: "Quel est le rôle principal de votre agent ?",
    options: [
      { value: "answer", label: "Répondre aux questions" },
      { value: "book", label: "Prendre des rendez-vous" },
      { value: "route", label: "Orienter vers la bonne personne" },
      { value: "qualify", label: "Qualifier les prospects pour les relancer" },
    ],
  },
  {
    id: "transfer", kind: "single", title: "Quand l'agent doit-il transférer l'appel à un humain ?",
    options: [
      { value: "urgent", label: "Seulement en cas d'urgence" },
      { value: "asked", label: "Quand l'appelant le demande" },
      { value: "unknown", label: "Quand l'agent ne connaît pas la réponse" },
      { value: "never", label: "Jamais : il prend un message" },
    ],
  },
  {
    id: "tone", kind: "single", title: "Quel ton doit avoir votre agent ?",
    options: [
      { value: "formal", label: "Formel (vouvoiement, très poli)" },
      { value: "warm", label: "Chaleureux et souriant" },
      { value: "direct", label: "Direct et efficace" },
    ],
  },
  {
    id: "hours", kind: "text", title: "Quels sont vos horaires d'ouverture ?",
    placeholder: "Ex. Lundi-vendredi 8h-18h, samedi 9h-13h",
  },
];

export const QuizAnswersSchema = z.object({
  businessName: z.string().min(2),
  sector: z.string(),
  activity: z.string().min(3),
  city: z.string().min(2),
  callsPerDay: z.string(),
  callReasons: z.array(z.string()).min(1),
  missedWhen: z.array(z.string()),
  goal: z.enum(["answer", "book", "route", "qualify"]),
  transfer: z.enum(["urgent", "asked", "unknown", "never"]),
  tone: z.enum(["formal", "warm", "direct"]),
  hours: z.string().min(3),
});
export type QuizAnswers = z.infer<typeof QuizAnswersSchema>;
