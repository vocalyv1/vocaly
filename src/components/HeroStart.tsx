"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/funnel/track";

// Hero : le visiteur commence tout de suite en donnant le nom de son entreprise. Le quiz reprend ce nom.
export function HeroStart() {
  const router = useRouter();
  const [name, setName] = useState("");
  return (
    <form
      className="hero-start"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = name.trim().slice(0, 80);
        try {
          if (clean.length >= 2) localStorage.setItem("vocaly-prefill", JSON.stringify({ businessName: clean }));
        } catch {}
        track("hero_start", { withName: clean.length >= 2 });
        router.push("/onboarding");
      }}
    >
      <label className="sr-only" htmlFor="hero-business">Nom de votre entreprise</label>
      <input id="hero-business" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de votre entreprise" autoComplete="organization" maxLength={80} />
      <button className="btn btn-primary" type="submit">
        Créer mon agent
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </form>
  );
}
