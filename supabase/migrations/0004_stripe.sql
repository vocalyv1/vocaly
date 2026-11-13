-- Vocaly : paiement par carte bancaire (Stripe Checkout), à côté de Mobile Money.
alter table public.payments alter column operator drop not null;
alter table public.payments alter column phone drop not null;
alter table public.payments add column if not exists provider_ref text;   -- identifiant de la session Stripe Checkout
create unique index if not exists payments_provider_ref_idx on public.payments(provider, provider_ref) where provider_ref is not null;
