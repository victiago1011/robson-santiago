-- Public order tracking authorizations for physical orders.
-- Store SHA-256 token hashes only. Never store the raw tracking token.
-- Multiple active authorizations per order are allowed (no UNIQUE on order_id).
-- Do not revoke prior rows when issuing a new link. Do not change fulfillment_status.
-- RLS enabled with no anon/authenticated policies. Service role only.
-- Apply this file manually in the Supabase project; do not edit already-applied migrations.

create table public.order_tracking_access (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  token_hash text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.order_tracking_access is
  'Capability tokens for public physical-order tracking pages. One or more rows per order. Never store a raw token. Independent of digital_deliveries.';

comment on column public.order_tracking_access.token_hash is
  'SHA-256 digest of the opaque tracking token. Never store the raw token.';

comment on column public.order_tracking_access.revoked_at is
  'When set, the token must not resolve. Issuing a new authorization must not set this on prior rows.';

create index order_tracking_access_order_id_idx
  on public.order_tracking_access (order_id);

create trigger order_tracking_access_set_updated_at
  before update on public.order_tracking_access
  for each row execute procedure public.set_updated_at();

alter table public.order_tracking_access enable row level security;

revoke all on table public.order_tracking_access from anon, authenticated;

-- Extend order email ledger kinds for buyer order confirmation.
alter table public.order_email_notifications
  drop constraint order_email_notifications_kind_check;

alter table public.order_email_notifications
  add constraint order_email_notifications_kind_check check (
    kind in ('admin_physical_sale', 'buyer_shipped', 'buyer_order_confirmed')
  );

comment on column public.order_email_notifications.kind is
  'admin_physical_sale: notify ops of a paid physical order. buyer_order_confirmed: notify buyer after payment. buyer_shipped: notify buyer after tracking is saved.';
