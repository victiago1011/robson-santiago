-- Extensible market indicator catalogue. Slugs are permanent stable IDs;
-- names can change without disturbing history or the hand-entered values.
alter table public.panorama_market_indicators
  drop constraint if exists panorama_market_slug_check;
alter table public.panorama_market_indicators
  add constraint panorama_market_slug_check
  check (slug ~ '^[a-z][a-z0-9-]{1,47}$');

create unique index if not exists panorama_market_indicators_name_unique
  on public.panorama_market_indicators (lower(btrim(label)));

create or replace function public.panorama_rename_market_indicator(
  p_slug text, p_label text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.panorama_market_indicators
  set label = p_label, updated_at = now()
  where slug = p_slug;
  if not found then raise exception 'Indicador não encontrado'; end if;
  update public.panorama_market_snapshots
  set label = p_label, updated_at = now()
  where slug = p_slug;
end;
$$;
revoke all on function public.panorama_rename_market_indicator(text,text) from public,anon,authenticated;
grant execute on function public.panorama_rename_market_indicator(text,text) to service_role;
