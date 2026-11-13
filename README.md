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
| `PAWAPAY_API_TOKEN` | Tableau de bord PawaPay → API | Paiement Mobile Money (MTN, Airtel) |
| `PAWAPAY_ENV` | `sandbox` ou `production` | Choix de l'API PawaPay |
| `STRIPE_SECRET_KEY` | Stripe → Développeurs → Clés API (`sk_test_…` puis `sk_live_…`) | Paiement par carte (Stripe Checkout) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Développeurs → Webhooks → secret de signature (`whsec_…`) | Vérifier que les confirmations viennent de Stripe |

Sans les variables Supabase, le site vitrine et le quiz fonctionnent ; l'espace client affiche « en cours d'activation ». Sans ElevenLabs, les réglages s'enregistrent mais le test vocal et la publication sont désactivés, avec un message clair.

## Mise en place

Production : https://vocaly-theta.vercel.app (Supabase : projet `vrqwwohqdpxtjxlyagcc`).


1. **Supabase** : créer le projet, puis exécuter dans l'éditeur SQL, dans l'ordre, les fichiers `supabase/migrations/0001_init.sql` à `0004_stripe.sql`.
   Dans Authentication → URL Configuration : Site URL = l'adresse du site, Redirect URLs = `https://<site>/auth/callback`.
2. **ElevenLabs** : dans les réglages des agents, déclarer le webhook post-appel `https://<site>/api/webhooks/elevenlabs` (événement « transcription »), et copier son secret dans `ELEVENLABS_WEBHOOK_SECRET`.
3. **Paiements** : webhook Stripe `https://<site>/api/webhooks/stripe` (événements `checkout.session.completed`, `.async_payment_succeeded`, `.async_payment_failed`, `.expired`) ; callback PawaPay `https://<site>/api/webhooks/pawapay`. Les abonnements ne s'activent qu'après relecture du paiement chez le prestataire.
4. **Téléphonie** : le numéro +242 (SIP) est rattaché à l'agent publié (`provider_agent_id`) dans ElevenLabs → Phone Numbers. Le statut « Connecté » est posé à la main (clé service) uniquement après confirmation de l'opérateur et un appel d'essai réussi.

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

## Mesure du parcours (conversion)

Chaque étape est enregistrée dans la table `funnel_events` (migration 0005), écrite uniquement par le serveur
(`/api/track` pour le navigateur, `trackServer()` pour les actions serveur). Aucune donnée personnelle : un identifiant
de visite anonyme (`session_id`) et, une fois connecté, l'identifiant du compte.

Étapes : `landing_view`, `cta_click`, `hero_start`, `signup_view`, `signup_done`, `quiz_start`, `quiz_step`, `quiz_done`,
`agent_saved`, `paywall_view`, `paywall_click`, `billing_view`, `addon_checked`, `payment_started`, `payment_completed`,
`exit_offer_shown`, `exit_offer_accepted`.

Entonnoir des 30 derniers jours (éditeur SQL Supabase) :

```sql
select event,
       count(distinct coalesce(user_id::text, session_id, business_id::text)) as personnes
from funnel_events
where created_at > now() - interval '30 days'
  and event in ('landing_view','cta_click','signup_view','signup_done','quiz_start','quiz_done','agent_saved','paywall_view','billing_view','payment_started','payment_completed')
group by event
order by personnes desc;
```

Abandon question par question : `select meta->>'id' as question, count(*) from funnel_events where event = 'quiz_step' group by 1 order by 2 desc;`

## Tâche quotidienne (e-mails)

`/api/cron/daily` est appelée chaque jour à 7 h UTC (8 h à Brazzaville) par Vercel Cron (`vercel.json`). Elle envoie :
rappels de renouvellement (J-7, J-3, veille/jour même, lendemain de l'expiration), alertes de minutes (80 % et 100 %)
et le récapitulatif du lundi. Chaque e-mail n'est envoyé qu'une fois (table `notifications_sent`, migration 0006).

Variables : `CRON_SECRET` (chaîne aléatoire, Vercel l'envoie dans l'en-tête Authorization), `RESEND_API_KEY`, `RESEND_FROM`.
Sans ces variables, la route refuse l'appel ou n'envoie rien. Les bandeaux de l'espace client fonctionnent sans elles.
