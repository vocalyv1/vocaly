// Affiché immédiatement au changement de section, le temps que la page arrive du serveur.
export default function Loading() {
  return (
    <div className="page-loading" aria-busy="true" aria-label="Chargement">
      <div className="mb-6 space-y-2">
        <div className="skel h-9 w-56" />
        <div className="skel h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="skel h-32 rounded-3xl" />
        <div className="skel h-32 rounded-3xl" />
        <div className="skel h-32 rounded-3xl" />
      </div>
      <div className="skel mt-4 h-64 rounded-3xl" />
    </div>
  );
}
