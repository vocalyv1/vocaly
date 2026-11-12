import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Envoi de documents (PDF…) par action serveur : Vercel limite le corps des requêtes à 4,5 Mo.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
