/* eslint-disable @next/next/no-img-element */
import { BRAND } from "@/lib/brand";

// Logo noir sur le thème clair, logo blanc sur le thème sombre.
export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <>
      <img src="/logo.svg" alt={BRAND.name} className={`${className} dark:hidden`} />
      <img src="/logo-blanc.svg" alt={BRAND.name} className={`${className} hidden dark:block`} />
    </>
  );
}
