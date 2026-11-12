import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import type { Agent, Business } from "@/lib/workspace";
import { buildSystemPrompt, type FaqItem } from "./prompt";

// Tous les appels à ElevenLabs passent par ici, côté serveur uniquement (clé jamais exposée au navigateur).
export const elevenLabsConfigured = () => Boolean(process.env.ELEVENLABS_API_KEY);

let client: ElevenLabsClient | null = null;
export function el() {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY manquant");
  client ??= new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  return client;
}

export type KbDoc = { id: string; name: string; type: "text" | "url" | "file" };

// Modèle de langage et de voix : flash v2.5 est multilingue (français) et rapide au téléphone.
const LLM = "gemini-2.5-flash" as ElevenLabs.Llm;
const TTS_MODEL = "eleven_flash_v2_5" as ElevenLabs.TtsConversationalModel;

export function buildConversationConfig(business: Business, agent: Agent, faq: FaqItem[], docs: KbDoc[]): ElevenLabs.ConversationalConfig {
  const transfers = agent.transfer_rules
    .filter((r) => r.phone)
    .map((r) => ({
      transferDestination: { type: "phone" as const, phoneNumber: r.phone.replace(/\s/g, "") },
      condition: r.when || `L'appelant demande ${r.label || "un collaborateur"}`,
    }));
  const tools: Record<string, unknown> = {
    endCall: { type: "system", name: "end_call", params: { systemToolType: "end_call" } },
  };
  if (transfers.length) {
    tools.transferToNumber = { type: "system", name: "transfer_to_number", params: { systemToolType: "transfer_to_number", transfers } };
  }
  return {
    agent: {
      firstMessage: agent.speaks_first ? agent.greeting : "",
      language: "fr",
      prompt: {
        prompt: buildSystemPrompt(business, agent, faq),
        llm: LLM,
        temperature: 0.4,
        timezone: business.timezone || "Africa/Brazzaville",
        knowledgeBase: docs.map((d) => ({ type: d.type, name: d.name, id: d.id, usageMode: "auto" as const })),
        rag: { enabled: docs.length > 0 },
        builtInTools: tools as ElevenLabs.BuiltInToolsInput,
      } as ElevenLabs.PromptAgentApiModelOutput,
    },
    tts: { voiceId: agent.voice_id, modelId: TTS_MODEL } as ElevenLabs.TtsConversationalConfigOutput,
    conversation: { maxDurationSeconds: agent.max_call_seconds } as ElevenLabs.ConversationConfigOutput,
  };
}

// Crée l'agent ElevenLabs s'il n'existe pas encore, sinon le met à jour. Renvoie son identifiant.
export async function upsertProviderAgent(existingId: string | null, name: string, config: ElevenLabs.ConversationalConfig) {
  if (existingId) {
    await el().conversationalAi.agents.update(existingId, { name, conversationConfig: config });
    return existingId;
  }
  const res = await el().conversationalAi.agents.create({ name, conversationConfig: config, tags: ["vocaly"] });
  return res.agentId;
}

export async function createTextDoc(name: string, text: string) {
  return (await el().conversationalAi.knowledgeBase.documents.createFromText({ name, text })).id;
}
export async function createUrlDoc(name: string, url: string) {
  return (await el().conversationalAi.knowledgeBase.documents.createFromUrl({ name, url })).id;
}
export async function createFileDoc(name: string, file: Blob, filename: string) {
  return (await el().conversationalAi.knowledgeBase.documents.createFromFile({ name, file: new File([file], filename) })).id;
}
export async function deleteDoc(id: string) {
  await el().conversationalAi.knowledgeBase.documents.delete(id, { force: true });
}

// Message d'erreur lisible pour l'utilisateur (le détail technique part dans error_logs).
export function providerErrorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) return "Configuration du serveur incomplète (clé service Supabase manquante dans Vercel).";
  if (msg.includes("ELEVENLABS_API_KEY")) return "Le service vocal n'est pas encore branché (clé ElevenLabs manquante dans Vercel).";
  if (/401|unauthori/i.test(msg)) return "La clé ElevenLabs est refusée. Vérifiez-la dans Vercel.";
  if (/quota|limit|402/i.test(msg)) return "Le quota ElevenLabs est atteint.";
  return "Le service vocal n'a pas répondu correctement. Réessayez dans un instant.";
}
