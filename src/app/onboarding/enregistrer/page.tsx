"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveOnboarding } from "../actions";

// Après le quiz (et l'inscription si besoin) : enregistre l'entreprise et l'agent, puis ouvre l'espace client.
export default function SaveOnboardingPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Enregistrement de votre agent…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let payload: unknown = null;
    try {
      payload = JSON.parse(localStorage.getItem("vocaly-onboarding") ?? "null");
    } catch {}
    saveOnboarding(payload).then((res) => {
      if (res.ok) {
        try { localStorage.removeItem("vocaly-onboarding"); } catch {}
        router.replace("/app/agent?bienvenue=1");
      } else if (res.reason === "auth") {
        router.replace("/inscription?next=/onboarding/enregistrer");
      } else if (res.reason === "invalid") {
        // Pas de quiz en mémoire (autre navigateur, quiz déjà enregistré) : on ouvre l'espace client.
        router.replace("/app");
      } else if (res.reason === "not_ready") {
        setMessage("Les comptes ne sont pas encore activés sur ce site. Réessayez bientôt.");
      } else {
        setMessage("L'enregistrement a échoué. Rechargez la page pour réessayer.");
      }
    });
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <p className="text-lg text-noir" role="status">{message}</p>
      <p className="mt-4 text-sm text-gris"><Link className="underline" href="/onboarding">Revenir au questionnaire</Link></p>
    </main>
  );
}
