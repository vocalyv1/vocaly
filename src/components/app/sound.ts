"use client";

// Sons d'interface synthétisés (Web Audio) : aucun fichier à charger. Volume réglable (0 à 100), mémorisé par navigateur.
type Kind = "tick" | "toggle" | "success" | "error" | "whoosh";
let ctx: AudioContext | null = null;
const KEY = "vocaly-volume";

export function getVolume() {
  try {
    const v = localStorage.getItem(KEY);
    if (v !== null) return Math.max(0, Math.min(100, Number(v) || 0));
    if (localStorage.getItem("vocaly-sound") === "off") return 0; // ancien réglage « son coupé »
  } catch {}
  return 100;
}
export function setVolume(v: number) {
  try { localStorage.setItem(KEY, String(Math.round(Math.max(0, Math.min(100, v))))); } catch {}
}

// Volume général des effets (les gains ci-dessous sont multipliés par cette valeur).
const VOLUME = 4;
let level = 1;

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine", to?: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(0.35, gain * VOLUME * level)), c.currentTime + start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

export function play(kind: Kind) {
  if (typeof window === "undefined") return;
  level = getVolume() / 100;
  if (level <= 0) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    if (kind === "tick") tone(1800, 0, 0.035, 0.035, "triangle");
    if (kind === "toggle") { tone(520, 0, 0.09, 0.05, "sine", 880); }
    if (kind === "whoosh") tone(320, 0, 0.18, 0.03, "sine", 140);
    if (kind === "success") { tone(660, 0, 0.12, 0.05); tone(990, 0.08, 0.18, 0.045); }
    if (kind === "error") { tone(300, 0, 0.12, 0.05, "triangle"); tone(220, 0.1, 0.16, 0.045, "triangle"); }
  } catch {}
}
