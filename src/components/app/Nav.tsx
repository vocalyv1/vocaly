"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "Vue d'ensemble" },
  { href: "/app/appels", label: "Appels" },
  { href: "/app/agent", label: "Mon agent" },
  { href: "/app/agent/connaissances", label: "Connaissances" },
  { href: "/app/telephone", label: "Téléphone" },
  { href: "/app/compte", label: "Compte" },
];

export function Nav() {
  const pathname = usePathname();
  // L'entrée la plus précise gagne (« Connaissances » plutôt que « Mon agent »).
  const active = ITEMS.filter((i) => (i.href === "/app" ? pathname === "/app" : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
            active === i.href ? "bg-brand text-sur-brand" : "text-gris hover:bg-perle hover:text-noir"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
