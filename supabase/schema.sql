-- Run this in the Supabase SQL editor for a new project.

create extension if not exists "uuid-ossp";

-- 0€ souvenir notes catalog (you add these yourself as you collect/spot them)
create table if not exists zero_notes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  country text not null,
  city text,
  year int,
  identification text,
  photo_url text,
  collected boolean not null default false,
  collected_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Currency denomination tracker (coins/notes per currency)
create table if not exists currency_items (
  id uuid primary key default uuid_generate_v4(),
  currency_name text not null,
  country text not null,
  denomination text not null,
  item_type text not null check (item_type in ('coin', 'note')),
  year int,
  photo_url text,
  collected boolean not null default false,
  collected_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Postcards sent home from each city visited
create table if not exists postcards (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  country text not null,
  city text not null,
  year int,
  photo_url text,
  collected boolean not null default false,
  collected_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Souvenirs bought (or wanted) at each stop, with a price for budgeting
create table if not exists souvenirs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  country text not null,
  city text,
  price numeric(10,2),
  photo_url text,
  collected boolean not null default false,
  collected_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Food/dishes tried, and where (restaurant)
create table if not exists food_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  restaurant text not null,
  country text not null,
  city text,
  photo_url text,
  collected boolean not null default false,
  collected_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Storage bucket for photos (both catalogs use it)
insert into storage.buckets (id, name, public)
values ('catalog-photos', 'catalog-photos', true)
on conflict (id) do nothing;

-- This is a personal single-user app with no login screen, so RLS is left
-- open to the anon key. Do not reuse this schema for a multi-user app
-- without adding real auth + per-row ownership checks.
alter table zero_notes enable row level security;
alter table currency_items enable row level security;
alter table postcards enable row level security;
alter table souvenirs enable row level security;
alter table food_items enable row level security;

create policy "anon full access to zero_notes" on zero_notes
  for all using (true) with check (true);

create policy "anon full access to currency_items" on currency_items
  for all using (true) with check (true);

create policy "anon full access to postcards" on postcards
  for all using (true) with check (true);

create policy "anon full access to souvenirs" on souvenirs
  for all using (true) with check (true);

create policy "anon full access to food_items" on food_items
  for all using (true) with check (true);

create policy "anon read/write catalog-photos" on storage.objects
  for all using (bucket_id = 'catalog-photos') with check (bucket_id = 'catalog-photos');

-- Seed: standard Eurozone denominations (generic — add country-specific
-- coin entries yourself as you collect them, e.g. "1 euro" / country "France").
insert into currency_items (currency_name, country, denomination, item_type) values
  ('Euro', 'Eurozone', '1 cent', 'coin'),
  ('Euro', 'Eurozone', '2 cent', 'coin'),
  ('Euro', 'Eurozone', '5 cent', 'coin'),
  ('Euro', 'Eurozone', '10 cent', 'coin'),
  ('Euro', 'Eurozone', '20 cent', 'coin'),
  ('Euro', 'Eurozone', '50 cent', 'coin'),
  ('Euro', 'Eurozone', '1 euro', 'coin'),
  ('Euro', 'Eurozone', '2 euro', 'coin'),
  ('Euro', 'Eurozone', '5 euro', 'note'),
  ('Euro', 'Eurozone', '10 euro', 'note'),
  ('Euro', 'Eurozone', '20 euro', 'note'),
  ('Euro', 'Eurozone', '50 euro', 'note'),
  ('Euro', 'Eurozone', '100 euro', 'note'),
  ('Euro', 'Eurozone', '200 euro', 'note'),
  ('Euro', 'Eurozone', '500 euro (legacy)', 'note')
on conflict do nothing;
