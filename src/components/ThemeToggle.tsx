"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Thème de base : clair (fond blanc, logo noir). Thème secondaire : sombre, au choix de l'utilisateur.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  // Le site vitrine a son propre bouton dans son en-tête.
  if (pathname === "/") return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}
      className="fixed right-4 top-4 z-10 rounded-full border border-ligne bg-surface px-3 py-1.5 text-sm text-gris hover:text-noir"
    >
      {dark ? "☀ Thème clair" : "☾ Thème sombre"}
    </button>
  );
}
