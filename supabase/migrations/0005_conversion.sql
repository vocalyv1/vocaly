-- Vocaly : leviers de conversion (minutes en option au paiement, offre de sortie, mesure du parcours).

-- 1. Minutes en option ajoutées à un paiement d'abonnement, et offre utilisée.
alter table public.payments
  add column if not exists addon_minutes int not null default 0 check (addon_minutes >= 0),
  add column if not exists offer_id uuid;

-- 2. Offres limitées dans le temps, proposées par le serveur (ex. −10 % sur l'annuel pendant 48 h).
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('exit_annual')),
  discount numeric not null check (discount > 0 and discount < 0.5),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, kind)                            -- une seule offre de ce type par entreprise
);
alter table public.offers enable row level security;
drop policy if exists "members read offers" on public.offers;
create policy "members read offers" on public.offers
  for select using (business_id in (select public.my_business_ids()));

-- 3. Mesure du parcours (visite, quiz, inscription, paiement). Écrit uniquement par le serveur.
create table if not exists public.funnel_events (
  id bigint generated always as identity primary key,
  event text not null,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  path text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_event_idx on public.funnel_events(event, created_at desc);
alter table public.funnel_events enable row level security;  -- aucune politique : lecture et écriture par la clé service seulement

-- 4. Activation : identique à 0003, plus les minutes en option et l'offre consommée.
create or replace function public.activate_payment(p_id uuid, p_payload jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  p public.payments;
  s public.subscriptions;
  step interval;
  minutes int;
  base timestamptz;
  result text;
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
    update public.subscriptions set paid_until = s.paid_until + step, last_payment_ref = p_id::text, payment_provider = p.provider,
      early_bird_until = case when p.early_bird and s.early_bird_until is null then now() + interval '1 year' else s.early_bird_until end,
      updated_at = now()
      where business_id = p.business_id;
    result := 'renewed';
  else
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
    result := 'activated';
  end if;

  if p.addon_minutes > 0 then
    update public.subscriptions set extra_seconds = extra_seconds + p.addon_minutes * 60 where business_id = p.business_id;
  end if;
  if p.offer_id is not null then
    update public.offers set used_at = now() where id = p.offer_id and used_at is null;
  end if;
  return result;
end $$;

revoke all on function public.activate_payment(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.activate_payment(uuid, jsonb) to service_role;
