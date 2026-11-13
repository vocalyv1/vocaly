"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resendCode, verifyCode, type OtpKind } from "@/app/(auth)/actions";

const LENGTH = 6;
type Stage = "input" | "checking" | "error" | "valid" | "collapse" | "done";

// Saisie du code reçu par e-mail. Une fois le code complet : les chiffres se placent en cercle et tournent
// pendant la vérification, passent au vert, se rassemblent, puis une coche apparaît.
export function OtpVerify({ email, kind, next }: { email: string; kind: OtpKind; next: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(60);
  const [resent, setResent] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(code: string) {
    setStage("checking");
    setError(null);
    const started = Date.now();
    const r = await verifyCode(email, code, kind).catch(() => ({ ok: false, error: "Vérification impossible. Réessayez." }));
    // L'orbite tourne au moins un tour complet, même si la réponse arrive vite.
    await new Promise((res) => setTimeout(res, Math.max(0, 1100 - (Date.now() - started))));
    if (!r.ok) {
      setStage("error");
      setError(r.error ?? "Code incorrect.");
      setTimeout(() => {
        setDigits(Array(LENGTH).fill(""));
        setStage("input");
        inputs.current[0]?.focus();
      }, 700);
      return;
    }
    setStage("valid");
    setTimeout(() => setStage("collapse"), 650);
    setTimeout(() => setStage("done"), 1150);
    setTimeout(() => router.replace(next), 2600);
  }

  function update(i: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, j) => (j === i ? "" : x)));
      return;
    }
    const nextDigits = [...digits];
    // Collage ou remplissage automatique : on répartit les chiffres à partir de la case courante.
    clean.slice(0, LENGTH - i).split("").forEach((c, k) => { nextDigits[i + k] = c; });
    setDigits(nextDigits);
    const pos = Math.min(LENGTH - 1, i + clean.length);
    inputs.current[pos]?.focus();
    if (nextDigits.every(Boolean)) submit(nextDigits.join(""));
  }

  async function resend() {
    setResent(null);
    const r = await resendCode(email, kind);
    setResent(r.ok ? "Nouveau code envoyé." : r.error ?? "Envoi impossible.");
    setWait(60);
  }

  const R = 64;
  const orbit = stage === "checking" || stage === "valid" || stage === "collapse";
  const done = stage === "done";

  return (
    <div className="otp" data-stage={stage}>
      <h2 className={`text-2xl font-bold ${done ? "text-traite" : "text-noir"}`}>
        {done ? (kind === "signup" ? "Compte vérifié" : "Code vérifié") : "Vérifiez votre e-mail"}
      </h2>
      <p className="mt-1 text-gris">
        {done
          ? "Un instant, on continue…"
          : <>Saisissez le code à {LENGTH} chiffres envoyé à <b className="text-noir">{email}</b>.</>}
      </p>

      <div className="otp-stage" aria-live="polite">
        <div className={`otp-ring${orbit ? " on" : ""}`} />
        <div className={`otp-spin${stage === "checking" ? " spinning" : ""}`}>
          {digits.map((d, i) => {
            const row = { x: (i - (LENGTH - 1) / 2) * 48, y: 0 };
            const a = (i / LENGTH) * Math.PI * 2 - Math.PI / 2;
            const circle = { x: Math.cos(a) * R, y: Math.sin(a) * R };
            const pos = stage === "collapse" || done ? { x: 0, y: 0 } : orbit ? circle : row;
            return (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                className={`otp-box${d ? " filled" : ""}`}
                style={{ transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`, transitionDelay: orbit ? `${i * 40}ms` : "0ms" }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={i === 0 ? LENGTH : 1}
                value={d}
                disabled={stage !== "input"}
                aria-label={`Chiffre ${i + 1}`}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
                  if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
                  if (e.key === "ArrowRight" && i < LENGTH - 1) inputs.current[i + 1]?.focus();
                }}
              />
            );
          })}
        </div>
        {done && (
          <div className="otp-done" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <i key={i} style={{ ["--a" as string]: `${(i / 14) * 360}deg`, ["--d" as string]: `${58 + (i % 3) * 14}px` }} />
            ))}
            <span className="otp-check">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-center text-sm text-red-600" role="alert">{error}</p>}
      {!done && (
        <p className="mt-4 text-center text-sm text-gris">
          Pas reçu le code ?{" "}
          {wait > 0 ? <span>Renvoyer dans {wait} s</span> : <button type="button" className="font-semibold text-noir underline" onClick={resend}>Renvoyer</button>}
          {resent && <span className="mt-1 block">{resent}</span>}
          <span className="mt-1 block text-xs">Pensez à regarder dans les courriers indésirables.</span>
        </p>
      )}
    </div>
  );
}
