-- Already applied in the robson-santiago Supabase project. Do not re-run.
-- Digital delivery (signed URL / email) is not implemented in this phase.
-- Store the private Storage object path only. Never store a signed URL.
-- Bucket `ebooks` is private. Do not add a public Storage policy.

alter table public.products
  add column if not exists digital_file_path text;

comment on column public.products.digital_file_path is
  'Private Supabase Storage object path for digital products. Store object path only, never a signed URL.';

update public.products
set digital_file_path = 'a-vida-e-um-dia-ebook.pdf'
where sku = 'AVIDA-EBOOK';
