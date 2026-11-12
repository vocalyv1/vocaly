# Vocaly

Agent téléphonique IA pour les entreprises du Congo et d'Afrique francophone. Next.js 15 (App Router), Supabase, ElevenLabs Agents, Claude (résumés d'appels), Resend (e-mails). Hébergé sur Vercel.

## Variables d'environnement (Vercel → Settings → Environment Variables)

Aucune clé ne doit être écrite dans le code ni envoyée dans une conversation.

| Variable | Où la trouver | Sert à |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Connexion à la base |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (clé `anon`) | Requêtes de l'utilisateur, protégées par la RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (clé `service_role`) | Webhook, synchronisation, journal d'erreurs. Serveur uniquement |
| `NEXT_PUBLIC_SITE_URL` | L'adresse du site : `https://vocaly-theta.vercel.app` (domaine de production) | Liens dans les e-mails et la confirmation d'inscription |
| `ELEVENLABS_API_KEY` | ElevenLabs → Developers → API Keys | Création et mise à jour des agents, base de connaissances |
| `ELEVENLABS_WEBHOOK_SECRET` | ElevenLabs → Agents → Settings → Post-call webhook | Vérifier que les fins d'appel viennent bien d'ElevenLabs |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Rapport structuré de chaque appel |
| `RESEND_API_KEY` | resend.com → API Keys | Envoi du résumé par e-mail |
| `RESEND_FROM` | Une adresse d'un domaine vérifié dans Resend, ex. `Vocaly <appels@vocaly.cg>` | Expéditeur des résumés |

Sans les variables Supabase, le site vitrine et le quiz fonctionnent ; l'espace client affiche « en cours d'activation ». Sans ElevenLabs, les réglages s'enregistrent mais le test vocal et la publication sont désactivés, avec un message clair.

## Mise en place

Production : https://vocaly-theta.vercel.app (Supabase : projet `vrqwwohqdpxtjxlyagcc`).


1. **Supabase** : créer le projet, puis exécuter dans l'éditeur SQL, dans l'ordre, `supabase/migrations/0001_init.sql` puis `0002_mvp.sql`.
   Dans Authentication → URL Configuration : Site URL = l'adresse du site, Redirect URLs = `https://<site>/auth/callback`.
2. **ElevenLabs** : dans les réglages des agents, déclarer le webhook post-appel `https://<site>/api/webhooks/elevenlabs` (événement « transcription »), et copier son secret dans `ELEVENLABS_WEBHOOK_SECRET`.
3. **Téléphonie** : le numéro +242 (SIP) est rattaché à l'agent publié (`provider_agent_id`) dans ElevenLabs → Phone Numbers. Le statut « Connecté » est posé à la main (clé service) uniquement après confirmation de l'opérateur et un appel d'essai réussi.

## Architecture

- `src/app/page.tsx` : site vitrine. `src/app/onboarding` : quiz et création de l'agent. `src/app/(auth)` : inscription, connexion.
- `src/app/app` : espace client (Vue d'ensemble, Appels, Mon agent, Connaissances, Téléphone, Compte).
- `src/lib/voice` : prompt et appels à ElevenLabs. Chaque agent Vocaly a un agent de **test** (reflète le brouillon) et un agent **en ligne** (mis à jour à la publication, qui fige une version dans `agent_versions`).
- `src/app/api/webhooks/elevenlabs` : fin d'appel → enregistrement, puis rapport Claude (`src/lib/calls/report.ts`) et e-mail.
- Sécurité : toutes les tables passent par la RLS (`my_business_ids()`). Les identifiants fournisseur et le statut du numéro ne sont modifiables qu'avec la clé service (triggers dans `0002_mvp.sql`).

## Développement

```bash
npm install
npm run dev
```
