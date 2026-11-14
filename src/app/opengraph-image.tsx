import { ImageResponse } from "next/og";

// Image de partage (WhatsApp, Facebook, LinkedIn) générée à la compilation.
export const alt = "Vocaly : votre agent téléphonique IA, 24 h/24, en français";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0B0C10", color: "#fff", padding: "72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: "#fff", color: "#0B0C10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800 }}>V</div>
          Vocaly
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Plus aucun appel client perdu.</div>
          <div style={{ fontSize: 36, color: "#A1A2A8" }}>Un agent téléphonique IA qui décroche à votre place, 24 h/24, en français.</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26 }}>
          {["Prêt en 5 minutes", "Mobile Money et carte", "Satisfait ou remboursé 14 jours"].map((t) => (
            <div key={t} style={{ display: "flex", border: "2px solid #2A2B32", borderRadius: 999, padding: "10px 22px" }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
