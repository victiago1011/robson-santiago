-- Manual indicators; no market API and no unverified initial prices.
create table if not exists public.panorama_market_indicators (
  slug text primary key,
  label text not null,
  display_value text not null default '',
  variation text not null default '',
  direction text not null default 'flat',
  reference_on date,
  visible boolean not null default false,
  display_order integer not null,
  updated_at timestamptz not null default now(),
  constraint panorama_market_slug_check check (slug in ('ibovespa','dolar','euro','selic','bitcoin','ouro','inflacao')),
  constraint panorama_market_direction_check check (direction in ('up','down','flat')),
  constraint panorama_market_value_length check (char_length(display_value) <= 48),
  constraint panorama_market_variation_length check (char_length(variation) <= 32),
  constraint panorama_market_label_length check (char_length(label) between 2 and 48),
  constraint panorama_market_publish_check check (not visible or (char_length(btrim(display_value)) > 0 and reference_on is not null))
);
alter table public.panorama_market_indicators enable row level security;
revoke all on public.panorama_market_indicators from anon, authenticated;
insert into public.panorama_market_indicators (slug,label,display_order) values
('ibovespa','Ibovespa',1),('dolar','Dólar',2),('euro','Euro',3),
('selic','Selic',4),('bitcoin','Bitcoin',5),('ouro','Ouro',6),
('inflacao','Inflação (IPCA)',7)
on conflict (slug) do nothing;
