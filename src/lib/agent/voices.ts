// Voix proposées à l'utilisateur. Les identifiants réels ElevenLabs seront branchés
// une fois le compte créé (jour 1) ; les libellés restent les mêmes.
export type Voice = { id: string; label: string; gender: "f" | "m"; style: string };

export const VOICES: Voice[] = [
  { id: "fr-f-warm", label: "Grace", gender: "f", style: "Chaleureuse, posée" },
  { id: "fr-f-pro", label: "Nadia", gender: "f", style: "Professionnelle, claire" },
  { id: "fr-f-young", label: "Lina", gender: "f", style: "Dynamique, souriante" },
  { id: "fr-m-warm", label: "Patrick", gender: "m", style: "Chaleureux, rassurant" },
  { id: "fr-m-pro", label: "Serge", gender: "m", style: "Professionnel, grave" },
  { id: "fr-m-young", label: "Kevin", gender: "m", style: "Dynamique, jeune" },
];
