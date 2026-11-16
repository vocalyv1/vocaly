-- Vocaly : routage d'un numéro Airtel unique vers l'agent de chaque entreprise.
-- Chaque entreprise renvoie son propre numéro vers le numéro Vocaly ; ce numéro d'entreprise est relié à son agent.
create table if not exists public.phone_routes (
  number text primary key check (number ~ '^\+242[02][0-9]{8}$'),   -- numéro de l'entreprise, format +242XXXXXXXXX
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  provider_phone_number_id text,                                 -- identifiant du numéro dans ElevenLabs
  created_at timestamptz not null default now(),
  connected_at timestamptz                                       -- premier appel réel reçu par l'agent
);
create index if not exists phone_routes_agent_idx on public.phone_routes(agent_id);
alter table public.phone_routes enable row level security;
drop policy if exists "members read routes" on public.phone_routes;
create policy "members read routes" on public.phone_routes
  for select using (business_id in (select public.my_business_ids()));
-- Aucune politique d'écriture : seul le serveur (clé service) crée ou modifie une route.
