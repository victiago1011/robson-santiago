-- Persist Resend acceptance before email_status becomes sent.
-- Blocks stale reclaim / a second send after the provider already accepted.
-- Do not store the raw download token, customer email, or API keys.
-- Apply this file manually in the Supabase project; do not edit already-applied migrations.

alter table public.digital_deliveries
  add column if not exists email_provider_message_id text;

alter table public.digital_deliveries
  add column if not exists email_provider_accepted_at timestamptz;

comment on column public.digital_deliveries.email_provider_message_id is
  'Resend email id returned when the provider accepted the send. Not a secret. Null until the provider accepts.';

comment on column public.digital_deliveries.email_provider_accepted_at is
  'Set immediately after Resend accepts the send, before email_status becomes sent. When not null, do not reclaim, rotate the token, or call Resend again.';
