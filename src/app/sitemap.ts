import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vocaly-theta.vercel.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/inscription", "/connexion", "/cgu", "/confidentialite", "/mentions-legales"].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: p ? "monthly" : "weekly",
    priority: p ? 0.3 : 1,
  }));
}
