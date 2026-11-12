import "server-only";
import type { CallReport } from "./report";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);

// Résumé d'appel envoyé au gérant (Resend, API HTTP).
export async function sendCallEmail(to: string, data: { businessName: string; agentName: string; callUrl: string; report: CallReport; when: string; duration: string; caller: string }) {
  const r = data.report;
  const rows: [string, string][] = [
    ["Appelant", `${r.caller_name} · ${r.caller_phone !== "Non communiqué" ? r.caller_phone : data.caller}`],
    ["Demande", r.request_type],
    ["Détails", r.request_details],
    ["Urgence", r.urgency],
    ["Rendez-vous demandé", r.appointment_requested ? `Oui : ${r.appointment_preference} (à confirmer par vous)` : "Non"],
    ["À faire", r.next_action],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#0B0C10">
<p style="color:#55565C;margin:0">${esc(data.when)} · ${esc(data.duration)}</p>
<h2 style="margin:8px 0 12px">${esc(r.request_type)}</h2>
<p>${esc(r.summary)}</p>
<table style="border-collapse:collapse;width:100%;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 8px;color:#55565C;vertical-align:top;width:40%">${esc(k)}</td><td style="padding:6px 8px">${esc(v)}</td></tr>`)
    .join("")}</table>
<p style="margin-top:20px"><a href="${esc(data.callUrl)}" style="background:#0B0C10;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Voir l'appel et la transcription</a></p>
<p style="color:#55565C;font-size:12px">Appel traité par ${esc(data.agentName)}, votre agent Vocaly.</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject: `Appel : ${r.request_type} · ${r.caller_name}`, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
