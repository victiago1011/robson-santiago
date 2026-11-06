-- Edition-scoped manually entered market snapshots and historical events.
create table if not exists public.panorama_market_snapshots (
 edition_on date not null,
 slug text not null references public.panorama_market_indicators(slug),
 label text not null,
 display_value text not null default '',
 variation text not null default '',
 direction text not null default 'flat',
 reference_on date,
 visible boolean not null default false,
 display_order integer not null,
 updated_at timestamptz not null default now(),
 primary key(edition_on, slug),
 constraint snapshot_valid_direction check(direction in ('up','down','flat')),
 constraint snapshot_value_length check(char_length(display_value)<=48),
 constraint snapshot_variation_length check(char_length(variation)<=32),
 constraint snapshot_visible_has_ref check(not visible or (btrim(display_value)<>'' and reference_on is not null))
);
alter table public.panorama_market_snapshots enable row level security;
revoke all on public.panorama_market_snapshots from anon, authenticated;
-- Preserve already supplied values only under their actual reference date,
-- when an edition exists for that date. Never copy today's values to yesterday.
insert into public.panorama_market_snapshots
(edition_on,slug,label,display_value,variation,direction,reference_on,visible,display_order)
select i.reference_on,i.slug,i.label,i.display_value,i.variation,
 i.direction,i.reference_on,i.visible,i.display_order
from public.panorama_market_indicators i
where i.reference_on is not null
 and exists(select 1 from public.panorama_posts p where p.published_on=i.reference_on)
on conflict(edition_on,slug) do nothing;
alter table public.panorama_edition_extras
 add column if not exists historical_events jsonb not null default '[]'::jsonb;
alter table public.panorama_edition_extras
 add constraint panorama_historical_events_array
 check (jsonb_typeof(historical_events)='array');
