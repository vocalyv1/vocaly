import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Rapport structuré produit après chaque appel. Toute information absente de la conversation vaut « Non communiqué ».
export const ReportSchema = z.object({
  summary: z.string().describe("Résumé de l'appel en 2 à 4 phrases, en français."),
  caller_name: z.string().describe("Nom de l'appelant, ou « Non communiqué »."),
  caller_phone: z.string().describe("Numéro donné par l'appelant pendant l'appel, ou « Non communiqué »."),
  caller_email: z.string().describe("E-mail donné par l'appelant, ou « Non communiqué »."),
  request_type: z.string().describe("Type de demande en 2 à 5 mots (ex. « Demande de devis », « Information horaires »)."),
  request_details: z.string().describe("Ce que veut précisément l'appelant, avec les détails donnés (produit, quantité, lieu, budget...)."),
  urgency: z.enum(["faible", "moyenne", "haute"]),
  appointment_requested: z.boolean().describe("L'appelant a demandé un rendez-vous, une réservation ou une visite."),
  appointment_preference: z.string().describe("Date et heure souhaitées telles que dites par l'appelant, ou « Non communiqué ». Jamais une date inventée."),
  is_lead: z.boolean().describe("Prospect : l'appelant envisage d'acheter ou de devenir client."),
  outcome: z.enum(["resolved", "transferred", "message", "unresolved"]).describe(
    "resolved = la demande a reçu sa réponse ; transferred = l'appel a été transféré ; message = un message a été pris pour rappel ; unresolved = la demande reste sans réponse.",
  ),
  next_action: z.string().describe("Action concrète que l'équipe doit faire maintenant (ex. « Rappeler M. Okemba avant 17 h pour le devis »), ou « Aucune »."),
  caller_sentiment: z.enum(["satisfait", "neutre", "mécontent"]),
  unanswered_questions: z.array(z.string()).describe(
    "Questions précises de l'appelant auxquelles l'agent n'a pas su répondre (il a dit ne pas savoir, a proposé de prendre un message faute d'information, ou a éludé). Reformulées en une question courte et claire. Liste vide si l'agent a répondu à tout.",
  ),
});
export type CallReport = z.infer<typeof ReportSchema>;

export const anthropicConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export async function generateReport(input: { businessName: string; agentName: string; transcript: string; durationSec: number | null }) {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    system:
      "Tu analyses la transcription d'un appel téléphonique reçu par un agent vocal pour une entreprise d'Afrique francophone. " +
      "Tu produis un rapport factuel, en français, destiné au gérant. N'invente rien : si une information n'a pas été dite, écris exactement « Non communiqué ». " +
      "Les numéros et noms doivent être recopiés tels qu'entendus. Un rendez-vous demandé n'est jamais considéré comme confirmé.",
    messages: [
      {
        role: "user",
        content:
          `Entreprise : ${input.businessName}\nAgent : ${input.agentName}\nDurée : ${input.durationSec ?? "inconnue"} s\n\n` +
          `<transcription>\n${input.transcript}\n</transcription>`,
      },
    ],
    output_config: { format: zodOutputFormat(ReportSchema), effort: "low" },
  });
  if (!response.parsed_output) throw new Error(`Rapport illisible (stop_reason=${response.stop_reason})`);
  return { report: response.parsed_output, usage: response.usage };
}
