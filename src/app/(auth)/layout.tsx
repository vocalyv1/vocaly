import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <Link href="/" className="mb-10" aria-label="Vocaly, accueil">
        <Logo className="h-8 w-auto" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
