-- Commerce schema: products, orders, order items, payment attempts, audit events.
-- RLS is enabled with no anon/authenticated policies. The Next.js server uses
-- the Supabase service role, which bypasses RLS. Do not add public SELECT
-- policies on orders, order_items, payments, or order_events.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  type text not null,
  title text not null,
  isbn text,
  price_cents integer,
  currency text not null default 'BRL',
  is_active boolean not null default false,
  weight_grams integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_type_check check (type in ('physical', 'digital')),
  constraint products_price_cents_check check (price_cents is null or price_cents > 0),
  constraint products_weight_grams_check check (weight_grams is null or weight_grams > 0),
  constraint products_currency_check check (currency = 'BRL')
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_document text not null,
  shipping_zip text,
  shipping_street text,
  shipping_number text,
  shipping_complement text,
  shipping_district text,
  shipping_city text,
  shipping_state text,
  subtotal_cents integer,
  shipping_cents integer,
  total_cents integer,
  currency text not null default 'BRL',
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'pending',
  tracking_code text,
  paid_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_payment_status_check check (
    payment_status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')
  ),
  constraint orders_fulfillment_status_check check (
    fulfillment_status in ('pending', 'preparing', 'shipped', 'delivered', 'cancelled')
  ),
  constraint orders_money_check check (
    (subtotal_cents is null or subtotal_cents >= 0)
    and (shipping_cents is null or shipping_cents >= 0)
    and (total_cents is null or total_cents >= 0)
  ),
  constraint orders_currency_check check (currency = 'BRL'),
  constraint orders_shipping_state_check check (
    shipping_state is null or char_length(shipping_state) = 2
  )
);

comment on column public.orders.payment_status is
  'Independent of fulfillment_status. Example: approved + preparing, then approved + shipped.';
comment on column public.orders.fulfillment_status is
  'Logistics only. Never store payment outcomes here.';
comment on column public.orders.public_id is
  'Non-sequential public identifier for status URLs. Not a serial integer.';
comment on column public.orders.customer_document is
  'CPF stored as 11 digits, no punctuation.';
comment on column public.orders.subtotal_cents is
  'Integer cents. NULL until pricing exists. Never use 0 to mean unset.';
comment on column public.orders.shipping_cents is
  'Integer cents. NULL until shipping is configured. 0 would mean free shipping only after that policy is explicit.';
comment on column public.orders.shipping_zip is
  'Required for physical products in application validation. NULL allowed for digital-only orders.';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  sku text not null,
  title text not null,
  quantity integer not null,
  unit_price_cents integer,
  total_price_cents integer,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_unit_price_check check (unit_price_cents is null or unit_price_cents > 0),
  constraint order_items_total_price_check check (total_price_cents is null or total_price_cents >= 0)
);

comment on column public.order_items.sku is 'Snapshot at purchase time.';
comment on column public.order_items.title is 'Snapshot at purchase time.';
comment on column public.order_items.unit_price_cents is 'Snapshot at purchase time, integer cents.';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  method text,
  status text not null,
  status_detail text,
  installments integer,
  amount_cents integer,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_provider_check check (provider in ('mercado_pago')),
  constraint payments_method_check check (method is null or method in ('pix', 'credit_card')),
  constraint payments_status_check check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process')
  ),
  constraint payments_installments_check check (installments is null or installments >= 1),
  constraint payments_amount_cents_check check (amount_cents is null or amount_cents > 0)
);

comment on table public.payments is
  'One row per payment attempt. Never store PAN, CVV, expiry, or PCI tokens.';

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.order_events is
  'Audit trail. metadata must not include card data or other secrets.';

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index payments_order_id_idx on public.payments (order_id);
create unique index payments_provider_payment_id_uidx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create index order_events_order_id_idx on public.order_events (order_id);
create index order_events_created_at_idx on public.order_events (created_at);
create index orders_customer_email_idx on public.orders (customer_email);
create index orders_created_at_idx on public.orders (created_at);

create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute procedure public.set_updated_at();

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_events enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.order_events from anon, authenticated;

insert into public.products (sku, type, title, isbn, price_cents, currency, is_active)
values
  (
    'AVIDA-FISICO',
    'physical',
    'A Vida é um Dia',
    '978-85-7146-160-4',
    null,
    'BRL',
    false
  ),
  (
    'AVIDA-EBOOK',
    'digital',
    'A Vida é um Dia — E-book',
    null,
    null,
    'BRL',
    false
  );
