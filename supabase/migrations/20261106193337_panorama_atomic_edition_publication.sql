-- Publish draft news and edition extras in one database transaction.
create or replace function public.panorama_publish_edition(p_date date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare published_count integer;
begin
  update public.panorama_posts
  set status = 'published', updated_at = now()
  where published_on = p_date and status = 'draft';
  get diagnostics published_count = row_count;
  update public.panorama_edition_extras
  set status = 'published', updated_at = now()
  where published_on = p_date and status = 'draft';
  return published_count;
end;
$$;
revoke all on function public.panorama_publish_edition(date) from public, anon, authenticated;
grant execute on function public.panorama_publish_edition(date) to service_role;
