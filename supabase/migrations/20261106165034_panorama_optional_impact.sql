-- Separately control whether to show "Por que importa?" per article.
-- Existing texts remain unchanged and enabled; hiding does not erase the writing.
alter table public.panorama_posts
  add column if not exists show_impact boolean not null default true;

update public.panorama_posts
set show_impact = false
where btrim(impact) = '' and show_impact = true;
