create extension if not exists pgcrypto;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  category text not null,
  price_paise integer not null check (price_paise > 0),
  compare_at_paise integer check (compare_at_paise is null or compare_at_paise > price_paise),
  image_path text not null,
  dimensions text not null,
  materials text not null,
  stock_qty integer not null default 0 check (stock_qty >= 0),
  badge text,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  email text not null,
  phone text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','paid','packed','shipped','delivered','cancelled')),
  subtotal_paise integer not null check (subtotal_paise >= 0),
  shipping_paise integer not null default 0 check (shipping_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  unit_price_paise integer not null check (unit_price_paise > 0),
  quantity integer not null check (quantity between 1 and 10),
  line_total_paise integer not null check (line_total_paise > 0)
);

create index products_active_sort_idx on public.products (active, sort_order, created_at desc);
create index products_category_active_idx on public.products (category, active);
create index order_items_order_id_idx on public.order_items (order_id);
create index orders_created_at_idx on public.orders (created_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Public can view active products"
on public.products for select
to anon, authenticated
using (active = true);

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;

create sequence public.order_number_seq start 1001;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

create or replace function public.create_store_order(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_subtotal integer := 0;
  v_shipping integer := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
begin
  if char_length(trim(p_customer_name)) < 2 then
    raise exception 'Please enter your full name.';
  end if;
  if p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Please enter a valid email address.';
  end if;
  if char_length(regexp_replace(p_phone, '[^0-9+]', '', 'g')) < 8 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'Your bag must contain between 1 and 20 items.';
  end if;

  v_order_number := 'TG-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  insert into public.orders (id, order_number, customer_name, email, phone, subtotal_paise, shipping_paise, total_paise)
  values (v_order_id, v_order_number, trim(p_customer_name), lower(trim(p_email)), trim(p_phone), 0, 0, 0);

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if not (v_item ? 'product_id') or not (v_item ? 'quantity') then
      raise exception 'Every item must include a product and quantity.';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'Item quantity must be between 1 and 10.';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid and active = true
    for update;

    if not found then
      raise exception 'A selected product is no longer available.';
    end if;
    if v_product.stock_qty < v_quantity then
      raise exception '% has only % remaining.', v_product.name, v_product.stock_qty;
    end if;

    insert into public.order_items (order_id, product_id, product_name, unit_price_paise, quantity, line_total_paise)
    values (v_order_id, v_product.id, v_product.name, v_product.price_paise, v_quantity, v_product.price_paise * v_quantity);

    update public.products set stock_qty = stock_qty - v_quantity, updated_at = now() where id = v_product.id;
    v_subtotal := v_subtotal + (v_product.price_paise * v_quantity);
  end loop;

  v_shipping := case when v_subtotal >= 1500000 then 0 else 75000 end;
  update public.orders
  set subtotal_paise = v_subtotal, shipping_paise = v_shipping, total_paise = v_subtotal + v_shipping
  where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal_paise', v_subtotal,
    'shipping_paise', v_shipping,
    'total_paise', v_subtotal + v_shipping
  );
end;
$$;

revoke all on function public.create_store_order(text,text,text,jsonb) from public;
grant execute on function public.create_store_order(text,text,text,jsonb) to anon, authenticated;

insert into public.products (slug,name,description,category,price_paise,image_path,dimensions,materials,stock_qty,badge,featured,sort_order)
values
  ('crimson-lotus-lakshmi','Crimson Lotus Lakshmi','A radiant square composition with crimson, emerald and hand-finished gold relief.','Lakshmi',1850000,'/products/lotus-lakshmi.png','18 × 18 in','Gold foil relief, gesso, natural pigments, teak-finish frame',4,'Bestseller',true,10),
  ('indigo-kamala','Indigo Kamala','Deep indigo grounds bring a quiet, evening character to this portrait-format piece.','Lakshmi',2400000,'/products/indigo-lakshmi.png','18 × 22 in','Gold foil relief, gesso, natural pigments, antique-gold frame',3,'New',true,20),
  ('emerald-prosperity','Emerald Prosperity','An intimate format for a prayer shelf, entrance console or meaningful gift.','Classic',1650000,'/products/lotus-lakshmi.png','14 × 16 in','Gold foil relief, gesso, jewel-tone pigments',6,null,false,30),
  ('temple-blue-heirloom','Temple Blue Heirloom','A grand-format statement piece designed for a focal wall and milestone occasions.','Grand format',3200000,'/products/indigo-lakshmi.png','24 × 30 in','Gold foil relief, raised gesso, pearl-like embellishment',1,'One of one',true,40)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  price_paise = excluded.price_paise,
  image_path = excluded.image_path,
  dimensions = excluded.dimensions,
  materials = excluded.materials,
  stock_qty = excluded.stock_qty,
  badge = excluded.badge,
  featured = excluded.featured,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();
