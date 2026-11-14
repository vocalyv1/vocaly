"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Mobile : bouton principal collé en bas une fois le haut de page passé. Partout : bouton WhatsApp flottant.
export function LandingFloat() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <a className={`wa-float ${show ? "up" : ""}`} href="https://wa.me/242057949393?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20Vocaly" target="_blank" rel="noopener" aria-label="Nous écrire sur WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
      </a>
      <div className={`sticky-cta ${show ? "on" : ""}`} aria-hidden={!show}>
        <Link className="btn btn-primary" href="/onboarding" tabIndex={show ? 0 : -1}>Créer mon agent</Link>
      </div>
    </>
  );
}
