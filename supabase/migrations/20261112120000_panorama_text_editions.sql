-- Simplified daily Panorama publishing: original full text is preserved.
-- Draft edits never modify the public snapshot until the explicit publish action.
create table if not exists public.panorama_text_editions (
  published_on date primary key,
  draft_text text not null default '',
  published_text text,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint panorama_text_draft_size check (octet_length(draft_text) <= 120000),
  constraint panorama_text_published_size check (published_text is null or octet_length(published_text) <= 120000),
  constraint panorama_text_public_not_blank check (published_text is null or length(btrim(published_text)) >= 80)
);
alter table public.panorama_text_editions enable row level security;
revoke all on public.panorama_text_editions from anon, authenticated;
grant select, insert, update, delete on public.panorama_text_editions to service_role;
create index if not exists panorama_text_editions_published_idx
  on public.panorama_text_editions(published_on desc) where published_text is not null;
