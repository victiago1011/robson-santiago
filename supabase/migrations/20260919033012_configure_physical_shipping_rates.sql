-- Physical shipping rates by quantity and max 4 copies of AVIDA-FISICO.
-- Do not edit already-applied migrations.

create table public.commerce_shipping_rates (
  physical_quantity integer primary key,
  shipping_cents integer not null,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_shipping_rates_quantity_check check (
    physical_quantity >= 1 and physical_quantity <= 4
  ),
  constraint commerce_shipping_rates_cents_check check (shipping_cents > 0),
  constraint commerce_shipping_rates_currency_check check (currency = 'BRL')
);

create trigger commerce_shipping_rates_set_updated_at
  before update on public.commerce_shipping_rates
  for each row execute procedure public.set_updated_at();

comment on table public.commerce_shipping_rates is
  'Server-owned shipping amounts by physical book quantity. One row per allowed quantity. Never derive these values with a formula in application code.';

insert into public.commerce_shipping_rates (physical_quantity, shipping_cents, currency)
values
  (1, 1500, 'BRL'),
  (2, 2000, 'BRL'),
  (3, 2500, 'BRL'),
  (4, 3000, 'BRL');

alter table public.commerce_shipping_rates enable row level security;

revoke all on table public.commerce_shipping_rates from anon, authenticated;

alter table public.commerce_settings
  drop column physical_shipping_cents;

comment on table public.commerce_settings is
  'Server-owned commerce constants. ebook_bump_price_cents is the promotional price of one ebook added to a physical order. Shipping lives in commerce_shipping_rates.';
