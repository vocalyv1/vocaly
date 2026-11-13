"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { getVolume, play, setVolume } from "./sound";

const I = {
  test: <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13" />,
  calls: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  phone: <path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4 15h2" />,
  sun: <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  soundOn: <path d="M4 9h3l5-4v14l-5-4H4V9Zm12 0a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" />,
  soundOff: <path d="M4 9h3l5-4v14l-5-4H4V9Zm12.5.5 5 5m0-5-5 5" />,
  out: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" />,
};

function Icon({ d }: { d: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      {label && <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg bg-surface px-2.5 py-1 text-xs text-noir opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        {label}
      </span>}
    </div>
  );
}

const btn = "flex h-10 w-10 items-center justify-center rounded-full text-sur-brand/60 transition-all duration-200 hover:bg-sur-brand/10 hover:text-sur-brand active:scale-90";

// Bascule de thème avec révélation circulaire depuis le bouton cliqué.
export function toggleTheme(e: React.MouseEvent, setDark: (d: boolean) => void) {
  const next = document.documentElement.dataset.theme !== "dark";
  const apply = () => {
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    flushSync(() => setDark(next));
  };
  play("whoosh");
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
  const x = e.clientX, y = e.clientY;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  doc.startViewTransition(apply).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}

// Rail d'outils flottant (raccourcis, thème, son, déconnexion).
export function SideRail() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  return (
    <aside data-silent className="fixed left-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-brand p-1.5 shadow-xl md:flex">
      <Tip label="Tester l'agent"><Link href="/app/agent#tester" className={btn} onClick={() => play("tick")}><Icon d={I.test} /></Link></Tip>
      <Tip label="Ajouter une connaissance"><Link href="/app/agent/connaissances" className={btn} onClick={() => play("tick")}><Icon d={I.book} /></Link></Tip>
      <Tip label="Derniers appels"><Link href="/app/appels" className={btn} onClick={() => play("tick")}><Icon d={I.calls} /></Link></Tip>
      <Tip label="Numéro de téléphone"><Link href="/app/telephone" className={btn} onClick={() => play("tick")}><Icon d={I.phone} /></Link></Tip>
      <span className="my-1 h-px w-6 bg-sur-brand/15" />
      <VolumeControl />
      <Tip label={dark ? "Thème clair" : "Thème sombre"}>
        <button type="button" className={btn} aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"} onClick={(e) => toggleTheme(e, setDark)}>
          <Icon d={dark ? I.sun : I.moon} />
        </button>
      </Tip>
      <Tip label="Se déconnecter">
        <form action="/auth/deconnexion" method="post"><button className={btn} aria-label="Se déconnecter"><Icon d={I.out} /></button></form>
      </Tip>
    </aside>
  );
}

// Bouton de thème compact pour la barre du haut sur mobile.
export function MobileThemeButton() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  return (
    <button type="button" onClick={(e) => toggleTheme(e, setDark)} aria-label="Changer de thème" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-gris md:hidden">
      <Icon d={dark ? I.sun : I.moon} />
    </button>
  );
}

// Volume des effets sonores : un clic sur l'icône ouvre un curseur à côté du rail.
function VolumeControl() {
  const [open, setOpen] = useState(false);
  const [vol, setVol] = useState(100);
  useEffect(() => setVol(getVolume()), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-volume]")) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="relative" data-volume>
      <Tip label={open ? "" : `Volume des sons : ${vol} %`}>
        <button type="button" className={btn} aria-label="Régler le volume des sons" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Icon d={vol === 0 ? I.soundOff : I.soundOn} />
        </button>
      </Tip>
      {open && (
        <div className="rise absolute left-full top-1/2 z-30 ml-3 flex -translate-y-1/2 items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-noir shadow-xl">
          <button type="button" className="text-gris hover:text-noir" aria-label={vol === 0 ? "Remettre le son" : "Couper le son"}
            onClick={() => { const v = vol === 0 ? 70 : 0; setVol(v); setVolume(v); if (v) play("toggle"); }}>
            <Icon d={vol === 0 ? I.soundOff : I.soundOn} />
          </button>
          <input type="range" min={0} max={100} step={5} value={vol} aria-label="Volume des sons"
            className="vol-range w-36"
            style={{ ["--v" as string]: `${vol}%` }}
            onChange={(e) => { const v = Number(e.target.value); setVol(v); setVolume(v); }}
            onPointerUp={() => play("tick")}
            onKeyUp={() => play("tick")} />
          <span className="w-10 text-right text-xs tabular-nums text-gris">{vol} %</span>
        </div>
      )}
    </div>
  );
}
