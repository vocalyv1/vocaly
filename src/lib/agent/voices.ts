// Voix françaises proposées (bibliothèque ElevenLabs, accent français standard, usage conversationnel).
// `id` est l'identifiant de voix ElevenLabs envoyé tel quel à l'agent.
export type Voice = { id: string; label: string; gender: "f" | "m"; style: string; previewUrl: string };

export const VOICES: Voice[] = [
  { id: "YxrwjAKoUKULGd0g8K9Y", label: "Lucie", gender: "f", style: "Chaleureuse, empathique",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/user/gg1lMbn4pfMl9KEjHqq6YAz1IYZ2/voices/YxrwjAKoUKULGd0g8K9Y/WxJo9vU6cjx9EPdS9beN.mp3" },
  { id: "HuLbOdhRlvQQN8oPP0AJ", label: "Claire", gender: "f", style: "Calme, professionnelle",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/workspace/5a2a2389ea394641bef1b77b9e0a19b2/voices/HuLbOdhRlvQQN8oPP0AJ/VBUQJhwECjat0IQof4DN.mp3" },
  { id: "fBpCO0Kf0krKLYGOu65w", label: "Émilie", gender: "f", style: "Énergique, rassurante",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/user/user_7701keew668mfwdvj6a4k5zm6kpx/voices/fBpCO0Kf0krKLYGOu65w/84b691e5-0664-4dd2-94dc-6f5c1ac3c675.mp3" },
  { id: "eOwAMwUJEGkP44SKOXIH", label: "Julien", gender: "m", style: "Calme, professionnel",
    previewUrl: "https://storage.googleapis.com/eleven-public-prod/database/user/user_1501kfjqcktrfk2vv97zx5tmz1ch/voices/eOwAMwUJEGkP44SKOXIH/ZsVXYEkRP5DLd1SZY4Ks.mp3" },
  { id: "kENkNtk0xyzG09WW40xE", label: "Marcel", gender: "m", style: "Chaleureux, naturel",
    previewUrl: "https://api.us.elevenlabs.io/v1/voices/kENkNtk0xyzG09WW40xE/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ1c2VyX2lkIjoiM1dhTDNabEpjcFlpN1BHM3h4ckxQTFk1ZnVoMSIsImZpbGVuYW1lIjoiWkN0dEZsZjVhVUFKeVdQdzc5NHIubXAzIiwidGltZXN0YW1wIjoxNzk0NTA2NDAwMDAwMDAwfQ%3D%3D" },
  { id: "IbbR6Av0dWuQJS0b8JVT", label: "Hugo", gender: "m", style: "Jeune, posé",
    previewUrl: "https://api.us.elevenlabs.io/v1/voices/IbbR6Av0dWuQJS0b8JVT/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ1c2VyX2lkIjoiQWlCbVNXNkpvd1lidnZuc2VMMGpqTDNaU21JMyIsImZpbGVuYW1lIjoiZDk1MzFmN2MtNGMxNy00YTU5LTlhYjEtM2JmZjFlNmRjZGZmLm1wMyIsInRpbWVzdGFtcCI6MTc5NDUwNjQwMDAwMDAwMH0%3D" },
];

// Le nom par défaut de l'agent (Daniel) est masculin : on propose une voix d'homme par défaut.
export const DEFAULT_VOICE_ID = "eOwAMwUJEGkP44SKOXIH";

export function voiceById(id: string) {
  return VOICES.find((v) => v.id === id);
}
