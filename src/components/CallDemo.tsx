"use client";

import { useEffect, useRef, useState } from "react";

// Exemple d'appel de la page d'accueil, lisible et écoutable.
// Si des fichiers /demo/appel-<n>.mp3 existent (voix enregistrées), ils sont joués ;
// sinon, la synthèse vocale du navigateur lit le dialogue en français.
const LINES = [
  { who: "agent", text: "Bonsoir, Clinique Les Palmiers, Voxa à votre écoute. Je suis un assistant virtuel. Comment puis-je vous aider ?" },
  { who: "client", text: "Bonsoir, je voudrais voir le pédiatre demain matin, c’est possible ?" },
  { who: "agent", text: "Le Dr Mabiala consulte demain matin. Je note votre demande et la clinique vous rappelle pour confirmer l’heure. À quel nom ?" },
  { who: "client", text: "Grâce Okemba, au 06 512 34 56." },
] as const;

// Le numéro est lu chiffre par chiffre, comme au téléphone.
const SPOKEN: Record<number, string> = { 3: "Grâce Okemba, au zéro six, cinq cent douze, trente-quatre, cinquante-six." };

function frenchVoices() {
  const all = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
  return all.filter((v) => v.lang.toLowerCase().startsWith("fr"));
}

export function CallDemo() {
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { stopRef.current = true; audioRef.current?.pause(); window.speechSynthesis?.cancel(); }, []);

  async function playFile(i: number) {
    return new Promise<boolean>((resolve) => {
      const a = new Audio(`/demo/appel-${i + 1}.mp3`);
      audioRef.current = a;
      a.onended = () => resolve(true);
      a.onerror = () => resolve(false);
      a.play().catch(() => resolve(false));
    });
  }

  function speak(i: number) {
    return new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) return resolve();
      const u = new SpeechSynthesisUtterance(SPOKEN[i] ?? LINES[i].text);
      u.lang = "fr-FR";
      const voices = frenchVoices();
      if (voices.length) u.voice = voices[LINES[i].who === "agent" ? 0 : Math.min(1, voices.length - 1)];
      u.pitch = LINES[i].who === "agent" ? 1 : 1.15;
      u.rate = 1.02;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    });
  }

  async function play() {
    if (playing) {
      stopRef.current = true;
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
      setPlaying(false);
      setActive(null);
      return;
    }
    stopRef.current = false;
    setPlaying(true);
    let useFiles = true;
    for (let i = 0; i < LINES.length; i++) {
      if (stopRef.current) break;
      setActive(i);
      if (useFiles) useFiles = await playFile(i);
      if (!useFiles && !stopRef.current) await speak(i);
      if (!stopRef.current) await new Promise((r) => setTimeout(r, 350));
    }
    setPlaying(false);
    setActive(null);
  }

  return (
    <>
      <button type="button" className={`call-play${playing ? " on" : ""}`} onClick={play} aria-pressed={playing}>
        <span className="call-play-icon" aria-hidden="true">{playing ? "■" : "▶"}</span>
        {playing ? "Arrêter" : "Écouter l’appel"}
      </button>
      <div className={`transcript${playing ? " is-playing" : ""}`}>
        {LINES.map((l, i) => (
          <div key={i} className={`msg ${l.who}${active === i ? " speaking" : ""}`}>
            <small>{l.who === "agent" ? "Voxa" : "Client"}</small>{l.text}
          </div>
        ))}
      </div>
    </>
  );
}
