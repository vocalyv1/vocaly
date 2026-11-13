"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { play } from "./sound";

export const NAV = [
  { href: "/app", label: "Vue d'ensemble" },
  { href: "/app/appels", label: "Appels" },
  { href: "/app/rapports", label: "Rapports" },
  { href: "/app/agent", label: "Mon agent" },
  { href: "/app/agent/connaissances", label: "Connaissances" },
  { href: "/app/telephone", label: "Téléphone" },
  { href: "/app/abonnement", label: "Abonnement" },
  { href: "/app/compte", label: "Compte" },
];

export function activeHref(pathname: string) {
  return NAV.filter((i) => (i.href === "/app" ? pathname === "/app" : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

// Navigation en pastilles : la pastille noire glisse vers l'onglet actif.
export function TopNav({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  const current = activeHref(pathname);
  // Au clic, la pastille part tout de suite vers l'onglet choisi (en même temps que le son),
  // sans attendre que la nouvelle page soit chargée.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  const active = pending && pending.from === pathname ? pending.href : current;
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-href="${active}"]`);
    if (el) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth });
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [active]);

  return (
    <div ref={wrap} className="relative flex items-center gap-0.5 overflow-x-auto rounded-full bg-surface p-1 [scrollbar-width:none]">
      {pill && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full bg-brand transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {NAV.map((i) => {
        const on = i.href === active;
        return (
          <Link
            key={i.href}
            href={i.href}
            data-href={i.href}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || i.href === active) return;
              setPending({ href: i.href, from: pathname });
              play("tick");
            }}
            className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-300 ${
              on ? "text-sur-brand" : "text-gris hover:text-noir"
            }`}
          >
            {i.label}
            {badges[i.href] ? (
              <span className={`rounded-full px-1.5 text-[10px] font-semibold ${on ? "bg-sur-brand/20" : "bg-perle text-noir"}`}>{badges[i.href]}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
