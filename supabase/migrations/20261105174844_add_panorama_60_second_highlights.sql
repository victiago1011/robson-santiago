-- Optional editorial curation of the 60-second news digest.
-- Existing posts remain not featured until manually selected.
alter table public.panorama_posts
  add column if not exists featured boolean not null default false;

create index if not exists panorama_posts_featured_day_idx
  on public.panorama_posts (published_on desc, created_at asc)
  where featured = true and status = 'published';
