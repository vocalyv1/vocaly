-- Schéma initial : un utilisateur possède une entreprise, qui possède un agent.
-- Les appels sont écrits par le webhook de fin d'appel (clé service), lus par le propriétaire.

create extension if not exists "pgcrypto";

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sector text not null,
  country text not null default 'CG',
  city text,
  website_url text,
  quiz_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses(owner_id);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  voice_id text not null,
  role text not null,
  instructions text not null,
  greeting text not null,
  speaks_first boolean not null default true,
  max_call_seconds int not null default 300,
  transfer_rules jsonb not null default '[]'::jsonb,   -- [{when, phone, label}]
  tags jsonb not null default '[]'::jsonb,             -- [{name, description}]
  faq jsonb not null default '[]'::jsonb,              -- [{q, a}]
  calendar_enabled boolean not null default false,
  phone_number text,
  phone_channel text not null default 'web',           -- 'sip' | 'whatsapp' | 'web'
  vapi_assistant_id text,
  status text not null default 'draft',                -- draft | test | live | paused
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index agents_business_unique on public.agents(business_id);

create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  kind text not null,                                  -- 'url' | 'file' | 'text'
  title text not null,
  source_ref text,                                     -- URL ou chemin Storage
  content text not null default '',                    -- texte extrait
  status text not null default 'pending',              -- pending | ready | error
  error text,
  created_at timestamptz not null default now()
);
create index knowledge_agent_idx on public.knowledge_sources(agent_id);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  vapi_call_id text unique,
  caller_number text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  outside_hours boolean not null default false,
  transcript text,
  recording_url text,
  summary text,
  need text,
  caller_name text,
  caller_contact text,
  tag text,
  next_action text,
  appointment_at timestamptz,
  transferred_to text,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index calls_agent_created_idx on public.calls(agent_id, created_at desc);

create table public.calendar_connections (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  provider text not null default 'google',
  calendar_id text not null default 'primary',
  refresh_token text not null,
  timezone text not null default 'Africa/Brazzaville',
  slot_minutes int not null default 30,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  plan text not null,                                  -- essentiel | pro | accompagnement
  period text not null default 'monthly',              -- monthly | yearly
  minutes_included int not null,
  minutes_used int not null default 0,
  paid_until timestamptz,
  payment_provider text,                               -- moneroo | pawapay
  last_payment_ref text,
  created_at timestamptz not null default now()
);

-- Sécurité : chaque propriétaire ne voit que ses données.
alter table public.businesses enable row level security;
alter table public.agents enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.calls enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.subscriptions enable row level security;

create policy "own business" on public.businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own agent" on public.agents
  for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create policy "own knowledge" on public.knowledge_sources
  for all using (exists (select 1 from public.agents a join public.businesses b on b.id = a.business_id
                         where a.id = agent_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.agents a join public.businesses b on b.id = a.business_id
                      where a.id = agent_id and b.owner_id = auth.uid()));

create policy "read own calls" on public.calls
  for select using (exists (select 1 from public.agents a join public.businesses b on b.id = a.business_id
                            where a.id = agent_id and b.owner_id = auth.uid()));

-- Le jeton Google n'est jamais lu côté client : aucune policy de lecture.
create policy "read own subscription" on public.subscriptions
  for select using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
