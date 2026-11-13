// Service worker minimal : permet d'installer l'espace client Vocaly sur le téléphone. Aucune mise en cache des données.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
