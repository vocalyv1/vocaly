"use client";

// Sons d'interface synthétisés (Web Audio) : aucun fichier à charger. Désactivables, mémorisés par navigateur.
type Kind = "tick" | "toggle" | "success" | "error" | "whoosh" | "nav";
let ctx: AudioContext | null = null;
const KEY = "vocaly-sound";

export function soundEnabled() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}
export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
}

// Volume général des effets (les gains ci-dessous sont multipliés par cette valeur).
const VOLUME = 4;

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine", to?: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(Math.min(0.35, gain * VOLUME), c.currentTime + start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

export function play(kind: Kind) {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    if (kind === "tick") tone(1800, 0, 0.035, 0.035, "triangle");
    if (kind === "toggle") { tone(520, 0, 0.09, 0.05, "sine", 880); }
    // Changement de section : glissement doux calé sur la pastille (≈ 0,3 s), puis un léger « tac » d'arrivée.
    if (kind === "nav") { tone(440, 0, 0.26, 0.04, "triangle", 760); tone(1500, 0.24, 0.035, 0.03, "triangle"); }
    if (kind === "whoosh") tone(320, 0, 0.18, 0.03, "sine", 140);
    if (kind === "success") { tone(660, 0, 0.12, 0.05); tone(990, 0.08, 0.18, 0.045); }
    if (kind === "error") { tone(300, 0, 0.12, 0.05, "triangle"); tone(220, 0.1, 0.16, 0.045, "triangle"); }
  } catch {}
}
