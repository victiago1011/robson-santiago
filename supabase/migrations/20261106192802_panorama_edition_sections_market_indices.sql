-- Complete daily Panorama editions with date-aware agenda and final commentator analysis.
create table if not exists public.panorama_edition_extras (
  published_on date primary key,
  agenda_items jsonb not null default '[]'::jsonb,
  commentary_title text not null default '',
  commentary_body text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  updated_at timestamptz not null default now(),
  constraint panorama_edition_agenda_is_array check (jsonb_typeof(agenda_items) = 'array'),
  constraint panorama_edition_commentary_title_length check (char_length(commentary_title) <= 240),
  constraint panorama_edition_commentary_body_length check (char_length(commentary_body) <= 30000)
);
alter table public.panorama_edition_extras enable row level security;
revoke all on public.panorama_edition_extras from anon, authenticated;

alter table public.panorama_market_indicators drop constraint if exists panorama_market_slug_check;
alter table public.panorama_market_indicators
  add constraint panorama_market_slug_check
  check (slug in ('ibovespa','dolar','euro','selic','bitcoin','ouro','inflacao','nasdaq','sp500','dowjones'));

insert into public.panorama_market_indicators (slug,label,display_order)
values ('nasdaq','Nasdaq Composite',8),('sp500','S&P 500',9),('dowjones','Dow Jones',10)
on conflict (slug) do nothing;
