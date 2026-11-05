-- Panorama 360 editorial content. Independent of orders, payments and digital delivery.
create table if not exists public.panorama_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint panorama_category_name_length check (char_length(btrim(name)) between 2 and 70)
);

create unique index if not exists panorama_categories_name_ci
  on public.panorama_categories (lower(btrim(name)));

create table if not exists public.panorama_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.panorama_categories(id) on delete restrict,
  title text not null,
  summary text not null default '',
  content text not null,
  impact text not null default '',
  source text not null default '',
  published_on date not null default (now() at time zone 'America/Sao_Paulo')::date,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint panorama_post_status_check check (status in ('draft', 'published')),
  constraint panorama_post_title_length check (char_length(btrim(title)) between 5 and 240),
  constraint panorama_post_content_length check (char_length(btrim(content)) between 1 and 50000),
  constraint panorama_post_summary_length check (char_length(summary) <= 1200),
  constraint panorama_post_impact_length check (char_length(impact) <= 12000),
  constraint panorama_post_source_length check (char_length(source) <= 1500)
);

create index if not exists panorama_posts_public_order_idx
  on public.panorama_posts (published_on desc, created_at desc)
  where status = 'published';
create index if not exists panorama_posts_category_idx
  on public.panorama_posts (category_id);
create index if not exists panorama_posts_status_idx
  on public.panorama_posts (status);

-- The web app exposes only server-side endpoints. All editorial queries use
-- the existing server-only Supabase secret client, never browser credentials.
alter table public.panorama_categories enable row level security;
alter table public.panorama_posts enable row level security;

revoke all on public.panorama_categories from anon, authenticated;
revoke all on public.panorama_posts from anon, authenticated;

-- Initial categories are editable from the admin. This migration creates no posts.
insert into public.panorama_categories (name)
values ('Brasil'), ('Mundo'), ('Economia & Mercados'), ('Política'), ('Tecnologia'), ('Negócios'), ('Santa Catarina')
on conflict do nothing;
