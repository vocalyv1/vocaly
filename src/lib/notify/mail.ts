import "server-only";
import { emailConfigured } from "@/lib/calls/email";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// E-mail simple aux couleurs Vocaly : un titre, des paragraphes, un bouton.
export async function sendMail(to: string, subject: string, o: { title: string; lines: string[]; cta?: { label: string; url: string } }) {
  if (!emailConfigured()) throw new Error("E-mail non configuré");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#0B0C10">
<h2 style="margin:0 0 12px">${esc(o.title)}</h2>
${o.lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5">${esc(l)}</p>`).join("")}
${o.cta ? `<p style="margin-top:20px"><a href="${esc(o.cta.url)}" style="background:#0B0C10;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">${esc(o.cta.label)}</a></p>` : ""}
<p style="color:#55565C;font-size:12px;margin-top:24px">Vocaly · une question ? WhatsApp +242 05 794 93 93</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
