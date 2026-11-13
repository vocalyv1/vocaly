import type { MetadataRoute } from "next";

// Espace client installable sur le téléphone (écran d'accueil).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vocaly",
    short_name: "Vocaly",
    description: "Votre agent téléphonique IA : appels, résumés et rappels.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0B0C10",
    theme_color: "#0B0C10",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
