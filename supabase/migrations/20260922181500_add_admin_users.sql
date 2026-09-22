-- Explicit admin allowlist. Supabase Auth identifies the user; a row here
-- authorizes admin access. No credential columns and no seed rows.
-- RLS is enabled with no anon/authenticated policies. The Next.js server reads
-- this table with SUPABASE_SECRET_KEY. Apply manually; do not edit earlier migrations.

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Allowlist of Supabase Auth users who may access /admin. Authentication stays in auth.users. This table stores no credentials.';

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;

create index if not exists order_items_sku_order_id_idx
  on public.order_items (sku, order_id);

-- Paginated physical-book orders for the admin. Ebook-only orders are excluded.
-- has_ebook is true only when an AVIDA-EBOOK line exists, not from promotion_code.
create or replace function public.list_admin_physical_orders(
  p_limit integer,
  p_offset integer
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_total integer;
  v_orders jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_PAGE_SIZE';
  end if;
  if p_offset is null or p_offset < 0 then
    raise exception 'INVALID_OFFSET';
  end if;

  select count(*)::integer
  into v_total
  from public.orders o
  where exists (
    select 1
    from public.order_items i
    where i.order_id = o.id
      and i.sku = 'AVIDA-FISICO'
  );

  select coalesce(
    jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc),
    '[]'::jsonb
  )
  into v_orders
  from (
    select
      o.id,
      o.public_id,
      o.created_at,
      o.customer_name,
      o.total_cents,
      o.payment_status,
      o.fulfillment_status,
      (
        select coalesce(sum(i.quantity), 0)::integer
        from public.order_items i
        where i.order_id = o.id
          and i.sku = 'AVIDA-FISICO'
      ) as physical_quantity,
      exists (
        select 1
        from public.order_items i
        where i.order_id = o.id
          and i.sku = 'AVIDA-EBOOK'
      ) as has_ebook
    from public.orders o
    where exists (
      select 1
      from public.order_items i
      where i.order_id = o.id
        and i.sku = 'AVIDA-FISICO'
    )
    order by o.created_at desc, o.id desc
    limit p_limit
    offset p_offset
  ) page;

  return jsonb_build_object(
    'total', v_total,
    'orders', v_orders
  );
end;
$$;

revoke all on function public.list_admin_physical_orders(integer, integer)
  from public, anon, authenticated;

grant execute on function public.list_admin_physical_orders(integer, integer)
  to service_role;
