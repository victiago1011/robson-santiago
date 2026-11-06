-- Prevent accidental duplicate imports of the same headline and date.
create unique index if not exists panorama_posts_unique_daily_headline
  on public.panorama_posts (published_on, lower(btrim(title)));
