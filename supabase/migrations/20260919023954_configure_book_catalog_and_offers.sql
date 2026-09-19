-- Phase 2B: catalog prices, ebook order bump, flat shipping, order discount fields.
-- Do not edit the already-applied init migration. This file is additive.
-- Ebook PDF remains out of the database and out of the repository in this phase.
-- Later: AVIDA-EBOOK file will live in a private Supabase Storage bucket and
-- be delivered only after payment_status = approved via a short-lived signed URL.

-- ---------------------------------------------------------------------------
-- Products: official list prices. Keep sales inactive until a controlled test.
-- ---------------------------------------------------------------------------

update public.products
set price_cents = 3990
where sku = 'AVIDA-FISICO';

update public.products
set price_cents = 1990
where sku = 'AVIDA-EBOOK';

update public.products
set is_active = false
where sku in ('AVIDA-FISICO', 'AVIDA-EBOOK');

comment on table public.products is
  'Catalog. Digital files (ebook PDF) will later live in a private Storage bucket; no file path is stored in this phase.';

-- ---------------------------------------------------------------------------
-- Server-side shipping and bump configuration. One row. No public access.
-- ---------------------------------------------------------------------------

create table public.commerce_settings (
  id smallint primary key default 1,
  physical_shipping_cents integer not null,
  ebook_bump_price_cents integer not null,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_settings_singleton_check check (id = 1),
  constraint commerce_settings_physical_shipping_check check (physical_shipping_cents > 0),
  constraint commerce_settings_ebook_bump_price_check check (ebook_bump_price_cents > 0),
  constraint commerce_settings_currency_check check (currency = 'BRL')
);

create trigger commerce_settings_set_updated_at
  before update on public.commerce_settings
  for each row execute procedure public.set_updated_at();

comment on table public.commerce_settings is
  'Server-owned commerce constants. physical_shipping_cents is charged once per order that contains a physical product. ebook_bump_price_cents is the promotional price of one ebook added to a physical order.';

insert into public.commerce_settings (id, physical_shipping_cents, ebook_bump_price_cents, currency)
values (1, 1500, 1000, 'BRL');

-- ---------------------------------------------------------------------------
-- Orders: discount, promotion origin, shipping method.
-- payment_status and fulfillment_status remain independent.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column discount_cents integer not null default 0,
  add column promotion_code text,
  add column shipping_method text;

alter table public.orders
  add constraint orders_discount_cents_check check (discount_cents >= 0),
  add constraint orders_shipping_method_check check (
    shipping_method is null or shipping_method = 'flat_rate'
  ),
  add constraint orders_promotion_code_check check (
    promotion_code is null or promotion_code = 'AVIDA-EBOOK-BUMP'
  );

comment on column public.orders.discount_cents is
  'Integer cents. Promotion discount at order level. Item unit prices stay at list price.';
comment on column public.orders.promotion_code is
  'AVIDA-EBOOK-BUMP when the order includes one promotional ebook with a physical purchase. NULL otherwise.';
comment on column public.orders.shipping_method is
  'flat_rate when the order contains a physical product. NULL for digital-only.';
comment on column public.orders.shipping_cents is
  'Integer cents. 0 for digital-only. Flat rate applied once per order that contains a physical product.';
comment on column public.orders.subtotal_cents is
  'Integer cents. Sum of item list prices before promotion discount.';

create index orders_promotion_code_idx on public.orders (promotion_code);

-- ---------------------------------------------------------------------------
-- Atomic order creation. Called only by the Next.js server (Secret Key).
-- Financial amounts must already have been computed server-side.
-- ---------------------------------------------------------------------------

create or replace function public.create_commerce_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_document text,
  p_shipping_zip text,
  p_shipping_street text,
  p_shipping_number text,
  p_shipping_complement text,
  p_shipping_district text,
  p_shipping_city text,
  p_shipping_state text,
  p_promotion_code text,
  p_shipping_method text,
  p_subtotal_cents integer,
  p_discount_cents integer,
  p_shipping_cents integer,
  p_total_cents integer,
  p_currency text,
  p_items jsonb,
  p_event_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order_id uuid;
  v_public_id uuid;
  v_item jsonb;
begin
  if p_currency is distinct from 'BRL' then
    raise exception 'INVALID_CURRENCY' using errcode = '22023';
  end if;

  if p_subtotal_cents is null
     or p_discount_cents is null
     or p_shipping_cents is null
     or p_total_cents is null
     or p_subtotal_cents < 0
     or p_discount_cents < 0
     or p_shipping_cents < 0
     or p_total_cents <= 0 then
    raise exception 'INVALID_AMOUNTS' using errcode = '22023';
  end if;

  if p_total_cents <> (p_subtotal_cents - p_discount_cents + p_shipping_cents) then
    raise exception 'TOTAL_MISMATCH' using errcode = '22023';
  end if;

  if p_shipping_method is not null and p_shipping_method is distinct from 'flat_rate' then
    raise exception 'INVALID_SHIPPING_METHOD' using errcode = '22023';
  end if;

  if p_promotion_code is not null and p_promotion_code is distinct from 'AVIDA-EBOOK-BUMP' then
    raise exception 'INVALID_PROMOTION' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  insert into public.orders (
    customer_name,
    customer_email,
    customer_phone,
    customer_document,
    shipping_zip,
    shipping_street,
    shipping_number,
    shipping_complement,
    shipping_district,
    shipping_city,
    shipping_state,
    subtotal_cents,
    discount_cents,
    shipping_cents,
    total_cents,
    currency,
    promotion_code,
    shipping_method,
    payment_status,
    fulfillment_status
  ) values (
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_document,
    p_shipping_zip,
    p_shipping_street,
    p_shipping_number,
    p_shipping_complement,
    p_shipping_district,
    p_shipping_city,
    p_shipping_state,
    p_subtotal_cents,
    p_discount_cents,
    p_shipping_cents,
    p_total_cents,
    p_currency,
    p_promotion_code,
    p_shipping_method,
    'pending',
    'pending'
  )
  returning id, public_id into v_order_id, v_public_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'sku', '') = ''
       or coalesce(v_item->>'title', '') = ''
       or coalesce(v_item->>'product_id', '') = '' then
      raise exception 'INVALID_ITEMS' using errcode = '22023';
    end if;

    insert into public.order_items (
      order_id,
      product_id,
      sku,
      title,
      quantity,
      unit_price_cents,
      total_price_cents
    ) values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'sku',
      v_item->>'title',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price_cents')::integer,
      (v_item->>'total_price_cents')::integer
    );
  end loop;

  insert into public.order_events (order_id, event_type, metadata)
  values (
    v_order_id,
    'order_created',
    coalesce(p_event_metadata, '{}'::jsonb)
  );

  return jsonb_build_object(
    'id', v_order_id,
    'public_id', v_public_id
  );
end;
$$;

revoke all on function public.create_commerce_order(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, integer, integer, integer, integer, text, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.create_commerce_order(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, integer, integer, integer, integer, text, jsonb, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: no public policies. Backend uses SUPABASE_SECRET_KEY.
-- ---------------------------------------------------------------------------

alter table public.commerce_settings enable row level security;

revoke all on table public.commerce_settings from anon, authenticated;
