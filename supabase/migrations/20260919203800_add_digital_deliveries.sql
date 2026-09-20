-- Digital delivery authorizations for paid ebook line items.
-- Store SHA-256 token hashes only. Never store the raw token or a signed URL.
-- File path stays on products.digital_file_path. Do not touch fulfillment_status.
-- RLS is enabled with no anon/authenticated policies. Apply this file manually
-- in the Supabase project; do not edit already-applied migrations.

create table public.digital_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  token_hash text not null unique,
  email_status text not null default 'pending',
  email_attempts integer not null default 0,
  email_sent_at timestamptz,
  last_email_attempt_at timestamptz,
  first_downloaded_at timestamptz,
  last_downloaded_at timestamptz,
  download_count integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_deliveries_email_status_check check (
    email_status in ('pending', 'sending', 'sent', 'failed')
  ),
  constraint digital_deliveries_email_attempts_check check (email_attempts >= 0),
  constraint digital_deliveries_download_count_check check (download_count >= 0)
);

comment on table public.digital_deliveries is
  'One authorization per digital order_item. Independent of orders.fulfillment_status. Never store a raw download token, signed URL, or file path.';

comment on column public.digital_deliveries.order_item_id is
  'Exactly one delivery row per digital line item.';

comment on column public.digital_deliveries.token_hash is
  'SHA-256 digest of the opaque download token. Never store the raw token.';

comment on column public.digital_deliveries.email_status is
  'Email send state for retries: pending, sending, sent, failed. Do not treat email_sent_at alone as a send claim.';

comment on column public.digital_deliveries.email_sent_at is
  'Set when email_status becomes sent. Null until a send succeeds.';

create index digital_deliveries_order_id_idx
  on public.digital_deliveries (order_id);

create index digital_deliveries_product_id_idx
  on public.digital_deliveries (product_id);

create trigger digital_deliveries_set_updated_at
  before update on public.digital_deliveries
  for each row execute procedure public.set_updated_at();

alter table public.digital_deliveries enable row level security;

revoke all on table public.digital_deliveries from anon, authenticated;
