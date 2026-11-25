// Voix françaises proposées (bibliothèque ElevenLabs, accent français standard, usage conversationnel).
// `id` est l'identifiant de voix ElevenLabs envoyé tel quel à l'agent.
export type Voice = { id: string; label: string; gender: "f" | "m"; style: string; previewUrl: string };

export const VOICES: Voice[] = [
  // Liste choisie par Thierry le 25/11/2026 dans la bibliothèque ElevenLabs.
  { id: "M4ZqLOXSFqxSkn9RDxFO", label: "Tony", gender: "m", style: "Chaleureux, énergique",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/workspace/4dbe56a53b3a4f5d917e11b6853c1222/voices/M4ZqLOXSFqxSkn9RDxFO/aVMYZBUL38F9IBvUpiVF.mp3" },
  { id: "W7gPf09CF58wFFfr22VS", label: "Christian", gender: "m", style: "Posé, professionnel",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/workspace/813d7a8bedab4e049c693fa513f92043/voices/W7gPf09CF58wFFfr22VS/veVMR4cSMRN7l8kEHJ5Z.mp3" },
  { id: "HbDa7eEZNGkUODgNzru6", label: "Esaïe", gender: "m", style: "Jeune, accent d'Afrique",
    previewUrl: "https://api.us.elevenlabs.io/v1/voices/HbDa7eEZNGkUODgNzru6/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiJkYWU3ZmExODgzZGM0NGMyYTBkNTczMWVhZTM2MzZkYiIsImZpbGVuYW1lIjoiM2Q0ZGFlNTktNmQzNS00NmUwLThjNGItZDM2ZDM5NzkwNjU2Lm1wMyIsInRpbWVzdGFtcCI6MTc5NTY0NDAwMDAwMDAwMH0%3D" },
  { id: "fBpCO0Kf0krKLYGOu65w", label: "Émilie", gender: "f", style: "Énergique, rassurante",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/user/user_7701keew668mfwdvj6a4k5zm6kpx/voices/fBpCO0Kf0krKLYGOu65w/84b691e5-0664-4dd2-94dc-6f5c1ac3c675.mp3" },
  { id: "DOqLhiOMs8JmafdomNTP", label: "Cécile", gender: "f", style: "Calme, accueillante",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/workspace/ed9b05e6324c457685490352e9a1ec90/voices/DOqLhiOMs8JmafdomNTP/Ey7ULsn4fcpWmO9dq3Xc.mp3" },
  { id: "4SFJvuIUvxaPLgk8FoK3", label: "Alimata", gender: "f", style: "Posée, accent d'Afrique",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/user/E5fKrZdA5ja6ZEWze6iPudEpXeY2/voices/4SFJvuIUvxaPLgk8FoK3/bt601yNgNwakf2tyYiyi.mp3" },
];

// Voix par défaut (choix de Thierry) : Tony.
export const DEFAULT_VOICE_ID = "M4ZqLOXSFqxSkn9RDxFO";

export function voiceById(id: string) {
  return VOICES.find((v) => v.id === id);
}
