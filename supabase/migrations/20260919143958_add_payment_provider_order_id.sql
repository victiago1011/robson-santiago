-- Phase 3A: persist Mercado Pago Orders API identifiers on payment attempts.
-- Do not edit already-applied migrations. Do not apply this file in this phase.

alter table public.payments
  add column if not exists provider_order_id text;

comment on column public.payments.provider_order_id is
  'Mercado Pago Orders API order id (e.g. ORD...). Distinct from provider_payment_id (transaction/payment id). Never store card PAN, CVV, or card tokens.';

comment on column public.payments.idempotency_key is
  'Stable UUID for one payment attempt. Reused as X-Idempotency-Key for retries of the same attempt. A new attempt after rejection must use a new key.';

create unique index if not exists payments_provider_order_id_uidx
  on public.payments (provider, provider_order_id)
  where provider_order_id is not null;
