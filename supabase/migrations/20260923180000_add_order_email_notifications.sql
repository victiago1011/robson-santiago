-- Idempotent email notification ledger for admin physical-sale alerts
-- and buyer shipped confirmations. One row per (order_id, kind).
-- Claim pattern mirrors digital_deliveries email_status.
-- RLS enabled with no anon/authenticated policies. Service role only.
-- Apply this file manually in the Supabase project; do not edit already-applied migrations.

create table public.order_email_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  provider_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_email_notifications_kind_check check (
    kind in ('admin_physical_sale', 'buyer_shipped')
  ),
  constraint order_email_notifications_status_check check (
    status in ('pending', 'sending', 'sent', 'failed')
  ),
  constraint order_email_notifications_attempts_check check (attempts >= 0),
  constraint order_email_notifications_order_kind_uidx unique (order_id, kind)
);

comment on table public.order_email_notifications is
  'Concurrent-safe email send ledger. Independent of payment_status and fulfillment_status. Never store secrets or raw Resend API keys.';

comment on column public.order_email_notifications.kind is
  'admin_physical_sale: notify ops of a paid physical order. buyer_shipped: notify customer after tracking is saved.';

comment on column public.order_email_notifications.status is
  'Send claim state: pending, sending, sent, failed. Do not treat sent_at alone as the claim.';

comment on column public.order_email_notifications.provider_accepted_at is
  'Set immediately after Resend accepts the send, before status becomes sent. When not null, do not reclaim or call Resend again.';

create index order_email_notifications_order_id_idx
  on public.order_email_notifications (order_id);

create index order_email_notifications_kind_status_idx
  on public.order_email_notifications (kind, status);

create trigger order_email_notifications_set_updated_at
  before update on public.order_email_notifications
  for each row execute procedure public.set_updated_at();

alter table public.order_email_notifications enable row level security;

revoke all on table public.order_email_notifications from anon, authenticated;
