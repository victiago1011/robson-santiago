-- Panorama 360: exclusive seven-calendar-day archive (Brazil local dates).
-- Only the daily news/market snapshots are deleted; reusable categories and
-- indicator catalogue names remain intact.
--
-- This procedure is executed by server-side service_role (admin) or postgres
-- (pg_cron); never grant execution to anonymous/authenticated visitors.

create or replace function public.panorama_delete_edition(p_date date)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_posts integer := 0;
  v_snapshots integer := 0;
  v_extras integer := 0;
  v_texts integer := 0;
  v_catalogue_values integer := 0;
begin
  if p_date is null then
    raise exception 'A data da edição é obrigatória.';
  end if;

  delete from public.panorama_market_snapshots where edition_on = p_date;
  get diagnostics v_snapshots = row_count;
  delete from public.panorama_posts where published_on = p_date;
  get diagnostics v_posts = row_count;
  delete from public.panorama_edition_extras where published_on = p_date;
  get diagnostics v_extras = row_count;
  delete from public.panorama_text_editions where published_on = p_date;
  get diagnostics v_texts = row_count;

  -- Old-format market values live on the reusable indicator catalogue itself.
  -- Clear values for the removed date but preserve the indicator definitions.
  update public.panorama_market_indicators
    set display_value = '', variation = '', direction = 'flat',
        reference_on = null, visible = false, updated_at = now()
    where reference_on = p_date;
  get diagnostics v_catalogue_values = row_count;

  return jsonb_build_object(
    'date', p_date, 'posts', v_posts, 'snapshots', v_snapshots,
    'extras', v_extras, 'texts', v_texts, 'catalogue_values_cleared', v_catalogue_values
  );
end;
$$;

revoke all on function public.panorama_delete_edition(date) from public, anon, authenticated;
grant execute on function public.panorama_delete_edition(date) to service_role;

create or replace function public.panorama_prune_expired()
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_cutoff date := (now() at time zone 'America/Sao_Paulo')::date - 7;
  v_day date;
  v_count integer := 0;
begin
  for v_day in
    select distinct candidate.edition_day
    from (
      select published_on as edition_day from public.panorama_posts
      union all
      select published_on from public.panorama_edition_extras
      union all
      select published_on from public.panorama_text_editions
      union all
      select edition_on from public.panorama_market_snapshots
      union all
      select reference_on from public.panorama_market_indicators where reference_on is not null
    ) candidate
    where candidate.edition_day <= v_cutoff
  loop
    perform public.panorama_delete_edition(v_day);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.panorama_prune_expired() from public, anon, authenticated;
grant execute on function public.panorama_prune_expired() to service_role;

-- 03:15 UTC = 00:15 America/Sao_Paulo (currently UTC-3).
-- The pruning function itself computes the cutoff in the Brazil timezone,
-- independently of pg_cron's internal timezone settings.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'panorama-7-day-retention',
  '15 3 * * *',
  $job$ select public.panorama_prune_expired(); $job$
);
