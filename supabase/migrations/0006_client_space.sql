-- Vocaly : espace client (suivi des rappels, questions sans réponse, notifications envoyées).

-- 1. Suivi « À rappeler » : l'équipe marque l'action comme faite (les membres peuvent déjà modifier leurs appels).
alter table public.calls
  add column if not exists follow_up_done_at timestamptz,
  add column if not exists follow_up_done_by uuid references auth.users(id) on delete set null;

-- 2. Questions auxquelles l'agent n'a pas su répondre, relevées dans le rapport d'appel.
create table if not exists public.unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  question text not null check (char_length(question) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed')),
  knowledge_source_id uuid references public.knowledge_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists unanswered_business_idx on public.unanswered_questions(business_id, status, created_at desc);
alter table public.unanswered_questions enable row level security;
drop policy if exists "members read questions" on public.unanswered_questions;
create policy "members read questions" on public.unanswered_questions
  for select using (business_id in (select public.my_business_ids()));
drop policy if exists "members update questions" on public.unanswered_questions;
create policy "members update questions" on public.unanswered_questions
  for update using (business_id in (select public.my_business_ids()));

-- 3. Notifications déjà envoyées (rappels de renouvellement, alertes de minutes, récapitulatif hebdomadaire).
-- La contrainte unique empêche d'envoyer deux fois le même e-mail. Écrit uniquement par le serveur.
create table if not exists public.notifications_sent (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  unique (business_id, kind, ref)
);
alter table public.notifications_sent enable row level security;
