-- MVP du 14/11 : entreprise à plusieurs membres, agent versionné (brouillon / publié) chez ElevenLabs,
-- base de connaissances, appels avec rapport structuré et coûts, journal d'erreurs.
-- Règle de sécurité : toute donnée appartient à une entreprise ; un utilisateur ne voit que les
-- entreprises dont il est membre (fonction my_business_ids()). Le serveur écrit les appels avec la clé service.

-- ---------- Entreprises et membres ----------
alter table public.businesses
  add column if not exists description text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists hours text,
  add column if not exists closed_days text,
  add column if not exists timezone text not null default 'Africa/Brazzaville',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',                 -- owner | member
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists business_members_user_idx on public.business_members(user_id);

-- Le propriétaire devient membre automatiquement.
create or replace function public.add_owner_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner') on conflict do nothing;
  return new;
end $$;
drop trigger if exists businesses_owner_member on public.businesses;
create trigger businesses_owner_member after insert on public.businesses
  for each row execute function public.add_owner_membership();

-- Entreprises de l'utilisateur connecté (security definer : évite la récursion RLS).
create or replace function public.my_business_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select business_id from public.business_members where user_id = auth.uid()
$$;

-- ---------- Profil ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- Agent : brouillon modifiable + versions publiées ----------
alter table public.agents
  add column if not exists tone text not null default 'warm',          -- formal | warm | direct | concise | dynamic
  add column if not exists language text not null default 'fr',
  add column if not exists description text,
  add column if not exists missions text,                              -- objectifs / infos à collecter
  add column if not exists forbidden text,                             -- informations interdites
  add column if not exists unknown_behavior text not null default 'message', -- message | transfer | callback
  add column if not exists unhappy_behavior text,
  add column if not exists enabled boolean not null default true,
  add column if not exists provider text not null default 'elevenlabs',
  add column if not exists provider_agent_id text,                     -- agent « en ligne » (reçoit les appels)
  add column if not exists provider_test_agent_id text,                -- agent de test (reflète le brouillon)
  add column if not exists draft_synced_at timestamptz,
  add column if not exists published_version int not null default 0,
  add column if not exists published_at timestamptz,
  add column if not exists phone_status text not null default 'not_configured', -- not_configured | configuring | connected | error | disabled
  add column if not exists phone_mode text,                            -- new_number | forwarding | porting
  add column if not exists phone_request jsonb not null default '{}'::jsonb,
  add column if not exists sync_error text;
alter table public.agents drop column if exists vapi_assistant_id;
-- Plusieurs agents par entreprise possibles plus tard ; l'interface n'en montre qu'un.
drop index if exists public.agents_business_unique;
create index if not exists agents_business_idx on public.agents(business_id);

create table if not exists public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  version int not null,
  config jsonb not null,
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);

-- ---------- Base de connaissances ----------
alter table public.knowledge_sources
  add column if not exists category text not null default 'general',
  add column if not exists provider_doc_id text,
  add column if not exists size_bytes int,
  add column if not exists updated_at timestamptz not null default now();
-- kind : 'text' | 'faq' | 'file' | 'url' ; status : pending | indexing | ready | error

-- ---------- Appels ----------
alter table public.calls drop column if exists vapi_call_id;
alter table public.calls
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists provider_call_id text unique,
  add column if not exists channel text not null default 'phone',     -- phone | web_test
  add column if not exists status text not null default 'processing', -- processing | resolved | transferred | unresolved | message | error
  add column if not exists request_type text,
  add column if not exists urgency text,                               -- faible | moyenne | haute
  add column if not exists is_lead boolean not null default false,
  add column if not exists has_appointment_request boolean not null default false,
  add column if not exists transcript_json jsonb,
  add column if not exists report jsonb,
  add column if not exists report_status text not null default 'pending', -- pending | ready | error
  add column if not exists report_error text,
  add column if not exists cost_voice_usd numeric(10,4),
  add column if not exists cost_llm_usd numeric(10,4),
  add column if not exists cost_phone_usd numeric(10,4),
  add column if not exists cost_report_usd numeric(10,4),
  add column if not exists provider_metadata jsonb,                   -- métadonnées brutes du fournisseur (coût en crédits, etc.)
  add column if not exists notified_at timestamptz;
create index if not exists calls_business_created_idx on public.calls(business_id, created_at desc);

-- ---------- Journal d'erreurs (lu par l'admin uniquement, via la clé service) ----------
create table if not exists public.error_logs (
  id bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete set null,
  source text not null,          -- webhook | sync | report | email | knowledge
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------- RLS : tout passe par l'appartenance à l'entreprise ----------
alter table public.business_members enable row level security;
alter table public.profiles enable row level security;
alter table public.agent_versions enable row level security;
alter table public.error_logs enable row level security;

drop policy if exists "own business" on public.businesses;
create policy "members read business" on public.businesses
  for select using (id in (select public.my_business_ids()) or owner_id = auth.uid());
create policy "owner creates business" on public.businesses
  for insert with check (owner_id = auth.uid());
create policy "members update business" on public.businesses
  for update using (id in (select public.my_business_ids())) with check (id in (select public.my_business_ids()));
create policy "owner deletes business" on public.businesses
  for delete using (owner_id = auth.uid());

create policy "see own memberships" on public.business_members
  for select using (user_id = auth.uid() or business_id in (select public.my_business_ids()));

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own agent" on public.agents;
create policy "members manage agent" on public.agents
  for all using (business_id in (select public.my_business_ids()))
  with check (business_id in (select public.my_business_ids()));

create policy "members read versions" on public.agent_versions
  for select using (agent_id in (select id from public.agents where business_id in (select public.my_business_ids())));
create policy "members add versions" on public.agent_versions
  for insert with check (agent_id in (select id from public.agents where business_id in (select public.my_business_ids())));

drop policy if exists "own knowledge" on public.knowledge_sources;
create policy "members manage knowledge" on public.knowledge_sources
  for all using (agent_id in (select id from public.agents where business_id in (select public.my_business_ids())))
  with check (agent_id in (select id from public.agents where business_id in (select public.my_business_ids())));

drop policy if exists "read own calls" on public.calls;
create policy "members read calls" on public.calls
  for select using (business_id in (select public.my_business_ids()));
-- Les membres peuvent requalifier un appel (statut). Les autres colonnes restent écrites par le serveur.
create policy "members update calls" on public.calls
  for update using (business_id in (select public.my_business_ids())) with check (business_id in (select public.my_business_ids()));
revoke update on public.calls from authenticated;
grant update (status) on public.calls to authenticated;

drop policy if exists "read own subscription" on public.subscriptions;
create policy "members read subscription" on public.subscriptions
  for select using (business_id in (select public.my_business_ids()));

-- ---------- Stockage des documents : un dossier par entreprise ----------
insert into storage.buckets (id, name, public) values ('knowledge', 'knowledge', false)
  on conflict (id) do nothing;
create policy "members read knowledge files" on storage.objects
  for select using (bucket_id = 'knowledge' and (storage.foldername(name))[1]::uuid in (select public.my_business_ids()));
create policy "members upload knowledge files" on storage.objects
  for insert with check (bucket_id = 'knowledge' and (storage.foldername(name))[1]::uuid in (select public.my_business_ids()));
create policy "members delete knowledge files" on storage.objects
  for delete using (bucket_id = 'knowledge' and (storage.foldername(name))[1]::uuid in (select public.my_business_ids()));

-- ---------- Champs réservés au serveur ----------
-- Les identifiants chez le fournisseur et le statut du numéro ne sont modifiables qu'avec la clé service :
-- un utilisateur ne peut ni rattacher l'agent d'une autre entreprise, ni se déclarer « connecté ».
create or replace function public.protect_agent_server_fields() returns trigger
language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.provider_agent_id := null; new.provider_test_agent_id := null; new.published_version := 0;
    new.published_at := null; new.draft_synced_at := null; new.phone_status := 'not_configured'; new.sync_error := null;
  else
    new.provider_agent_id := old.provider_agent_id; new.provider_test_agent_id := old.provider_test_agent_id;
    new.published_version := old.published_version; new.published_at := old.published_at;
    new.draft_synced_at := old.draft_synced_at; new.sync_error := old.sync_error;
    -- Seule transition permise côté client : demander la configuration du numéro.
    if not (new.phone_status = old.phone_status or (old.phone_status in ('not_configured', 'error') and new.phone_status = 'configuring')) then
      new.phone_status := old.phone_status;
    end if;
    new.phone_number := old.phone_number;
  end if;
  return new;
end $$;
drop trigger if exists agents_protect on public.agents;
create trigger agents_protect before insert or update on public.agents
  for each row execute function public.protect_agent_server_fields();

create or replace function public.protect_knowledge_server_fields() returns trigger
language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.provider_doc_id := null;
  elsif new.provider_doc_id is distinct from old.provider_doc_id and new.provider_doc_id is not null then
    new.provider_doc_id := old.provider_doc_id;
  end if;
  return new;
end $$;
drop trigger if exists knowledge_protect on public.knowledge_sources;
create trigger knowledge_protect before insert or update on public.knowledge_sources
  for each row execute function public.protect_knowledge_server_fields();
