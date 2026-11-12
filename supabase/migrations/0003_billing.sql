-- Vocaly : abonnements et paiements Mobile Money (PawaPay).
-- Les membres lisent leur abonnement et leurs paiements ; seules les fonctions serveur (clé service) écrivent.

-- 1. Abonnement (une ligne par entreprise, table créée en 0001).
alter table public.subscriptions
  add column if not exists status text not null default 'active',          -- active | expired
  add column if not exists current_period_start timestamptz,
  add column if not exists usage_period_start timestamptz,                 -- remise à zéro mensuelle, même en annuel
  add column if not exists seconds_used int not null default 0,
  add column if not exists extra_seconds int not null default 0,           -- recharges, sans expiration
  add column if not exists early_bird_until timestamptz,                   -- réduction avant-première jusqu'à cette date
  add column if not exists updated_at timestamptz not null default now();

-- 2. Paiements.
create table if not exists public.payments (
  id uuid primary key,                                  -- = depositId envoyé à PawaPay
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('subscription', 'topup')),
  plan text,
  period text check (period in ('monthly', 'yearly')),
  amount int not null check (amount > 0),
  minutes int not null check (minutes > 0),            -- minutes par mois de l'offre, ou minutes de la recharge
  currency text not null default 'XAF',
  early_bird boolean not null default false,
  provider text not null default 'pawapay',
  operator text not null,                               -- MTN_MOMO_COG | AIRTEL_COG
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  failure_reason text,
  provider_payload jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists payments_business_idx on public.payments(business_id, created_at desc);
alter table public.payments enable row level security;
drop policy if exists "members read payments" on public.payments;
create policy "members read payments" on public.payments
  for select using (business_id in (select public.my_business_ids()));

-- 3. Minutes consommées : un appel n'est compté qu'une fois.
alter table public.calls add column if not exists usage_recorded boolean not null default false;

-- 4. Activation d'un paiement confirmé (idempotente, appelée par le serveur uniquement).
create or replace function public.activate_payment(p_id uuid, p_payload jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  p public.payments;
  s public.subscriptions;
  step interval;
  minutes int;
  base timestamptz;
begin
  select * into p from public.payments where id = p_id for update;
  if not found then return 'not_found'; end if;
  if p.status = 'completed' then return 'already'; end if;

  update public.payments set status = 'completed', completed_at = now(), provider_payload = p_payload, failure_reason = null where id = p_id;

  select * into s from public.subscriptions where business_id = p.business_id for update;

  if p.kind = 'topup' then
    if not found then return 'no_subscription'; end if;
    update public.subscriptions set extra_seconds = extra_seconds + p.minutes * 60, last_payment_ref = p_id::text, updated_at = now()
      where business_id = p.business_id;
    return 'topup';
  end if;

  step := case when p.period = 'yearly' then interval '1 year' else interval '1 month' end;
  minutes := p.minutes;

  if found and s.status = 'active' and s.paid_until > now() and s.plan = p.plan and s.period = p.period and s.minutes_included = minutes then
    -- Renouvellement anticipé : la nouvelle période s'ajoute à la fin de la période en cours.
    update public.subscriptions set paid_until = s.paid_until + step, last_payment_ref = p_id::text, payment_provider = p.provider,
      early_bird_until = case when p.early_bird and s.early_bird_until is null then now() + interval '1 year' else s.early_bird_until end,
      updated_at = now()
      where business_id = p.business_id;
    return 'renewed';
  end if;

  base := now();
  insert into public.subscriptions as t (business_id, plan, period, minutes_included, minutes_used, paid_until, payment_provider, last_payment_ref,
                                         status, current_period_start, usage_period_start, seconds_used, early_bird_until, updated_at)
  values (p.business_id, p.plan, p.period, minutes, 0, base + step, p.provider, p_id::text, 'active', base, base, 0,
          case when p.early_bird then base + interval '1 year' else null end, now())
  on conflict (business_id) do update set
    plan = excluded.plan, period = excluded.period, minutes_included = excluded.minutes_included,
    paid_until = excluded.paid_until, payment_provider = excluded.payment_provider, last_payment_ref = excluded.last_payment_ref,
    status = 'active', current_period_start = excluded.current_period_start, usage_period_start = excluded.usage_period_start,
    seconds_used = 0, minutes_used = 0,
    early_bird_until = coalesce(t.early_bird_until, excluded.early_bird_until), updated_at = now();
  return 'activated';
end $$;

-- 5. Décompte d'un appel téléphonique (idempotent). Remet le compteur à zéro chaque mois.
create or replace function public.record_call_usage(p_call_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  c record;
  s public.subscriptions;
  secs int;
  new_start timestamptz;
begin
  update public.calls set usage_recorded = true
    where id = p_call_id and usage_recorded = false and channel = 'phone' and coalesce(is_test, false) = false
    returning business_id, coalesce(duration_seconds, 0) as d into c;
  if not found then return 0; end if;
  secs := c.d;

  select * into s from public.subscriptions where business_id = c.business_id for update;
  if not found then return secs; end if;

  new_start := coalesce(s.usage_period_start, now());
  while now() >= new_start + interval '1 month' loop
    new_start := new_start + interval '1 month';
  end loop;
  if s.usage_period_start is distinct from new_start then
    update public.subscriptions set usage_period_start = new_start, seconds_used = 0, minutes_used = 0 where business_id = c.business_id;
    s.seconds_used := 0;
  end if;

  -- Les minutes du forfait partent d'abord, puis les recharges.
  if s.seconds_used + secs > s.minutes_included * 60 then
    update public.subscriptions set
      extra_seconds = greatest(0, extra_seconds - (s.seconds_used + secs - greatest(s.seconds_used, s.minutes_included * 60))),
      seconds_used = s.seconds_used + secs, minutes_used = ceil((s.seconds_used + secs) / 60.0), updated_at = now()
      where business_id = c.business_id;
  else
    update public.subscriptions set seconds_used = s.seconds_used + secs, minutes_used = ceil((s.seconds_used + secs) / 60.0), updated_at = now()
      where business_id = c.business_id;
  end if;
  return secs;
end $$;

-- 6. Nombre de places avant-première déjà prises (lecture serveur).
create or replace function public.early_bird_taken() returns int language sql security definer set search_path = public as $$
  select count(*)::int from public.subscriptions where early_bird_until is not null
$$;

revoke all on function public.activate_payment(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.record_call_usage(uuid) from public, anon, authenticated;
revoke all on function public.early_bird_taken() from public, anon, authenticated;
grant execute on function public.activate_payment(uuid, jsonb) to service_role;
grant execute on function public.record_call_usage(uuid) to service_role;
grant execute on function public.early_bird_taken() to service_role;
