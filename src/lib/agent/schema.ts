import { z } from "zod";

// Brouillon produit par le quiz (voir generate.ts), validé avant d'être enregistré.
export const AgentDraftSchema = z.object({
  name: z.string().trim().min(1).max(40),
  voiceId: z.string().min(1),
  role: z.string().max(300),
  instructions: z.string().min(10).max(12000),
  greeting: z.string().min(5).max(600),
  speaksFirst: z.boolean(),
  maxCallSeconds: z.number().int().min(60).max(1800),
  transferRules: z.array(z.object({ when: z.string(), phone: z.string(), label: z.string() })).max(10),
  tags: z.array(z.object({ name: z.string(), description: z.string() })).max(20),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).max(50),
  calendarEnabled: z.boolean(),
});
export type AgentDraftInput = z.infer<typeof AgentDraftSchema>;

export const TONES = [
  { value: "warm", label: "Chaleureux" },
  { value: "formal", label: "Formel" },
  { value: "direct", label: "Direct et concis" },
  { value: "dynamic", label: "Dynamique" },
  { value: "professional", label: "Professionnel" },
] as const;

export const UNKNOWN_BEHAVIORS = [
  { value: "message", label: "Il le dit et prend un message (nom, numéro, besoin)" },
  { value: "transfer", label: "Il le dit et transfère l'appel à un collaborateur" },
  { value: "callback", label: "Il le dit et propose qu'on rappelle le client" },
] as const;

// Réglages modifiables depuis la page « Mon agent ».
export const AgentSettingsSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom à votre agent.").max(40),
  voice_id: z.string().min(1),
  tone: z.enum(["warm", "formal", "direct", "dynamic", "professional"]),
  greeting: z.string().trim().min(5, "Le message d'accueil est trop court.").max(600),
  speaks_first: z.boolean(),
  instructions: z.string().trim().min(10, "Les instructions sont trop courtes.").max(12000),
  missions: z.string().max(3000).optional().default(""),
  forbidden: z.string().max(3000).optional().default(""),
  unknown_behavior: z.enum(["message", "transfer", "callback"]),
  unhappy_behavior: z.string().max(1000).optional().default(""),
  max_call_seconds: z.number().int().min(60).max(1800),
  transfer_rules: z
    .array(
      z.object({
        label: z.string().trim().max(60),
        phone: z.string().trim().regex(/^\+?[0-9 ]{6,20}$/, "Numéro de transfert invalide (format +242…)."),
        when: z.string().trim().max(300),
      }),
    )
    .max(5),
});
export type AgentSettings = z.infer<typeof AgentSettingsSchema>;
