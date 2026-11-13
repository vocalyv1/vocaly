"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Aide WhatsApp toujours visible + installation de l'espace client sur le téléphone (application web).
export function HelpButton() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) setIos(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 md:right-6 md:bottom-6">
      {open && (
        <div className="pop-in w-64 rounded-2xl bg-surface p-4 text-sm shadow-xl ring-1 ring-ligne">
          <p className="font-semibold">Besoin d&apos;aide ?</p>
          <p className="mt-1 text-gris">Notre équipe répond sur WhatsApp.</p>
          <a href="https://wa.me/242057949393?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20sur%20Vocaly" target="_blank" rel="noopener"
            className="mt-3 block rounded-full bg-[#25D366] px-4 py-2 text-center font-semibold text-white">Écrire sur WhatsApp</a>
          {install && (
            <button type="button" onClick={async () => { await install.prompt(); setInstall(null); }}
              className="mt-2 block w-full rounded-full border border-ligne px-4 py-2 font-medium">Installer Vocaly sur cet appareil</button>
          )}
          {ios && !install && (
            <p className="mt-3 text-xs text-gris">Sur iPhone : touchez Partager, puis « Sur l&apos;écran d&apos;accueil » pour installer Vocaly comme une application.</p>
          )}
        </div>
      )}
      <button type="button" onClick={() => setOpen(!open)} aria-label="Aide"
        className="lift flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg">
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
        )}
      </button>
    </div>
  );
}
