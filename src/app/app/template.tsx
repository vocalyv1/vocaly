// Rejoué à chaque changement de page : entrée en fondu des blocs de la page.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
