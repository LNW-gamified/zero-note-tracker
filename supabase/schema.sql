-- Run this in the Supabase SQL editor for a new project.

create extension if not exists "uuid-ossp";

-- 0€ souvenir notes catalog (you add these yourself as you collect/spot them)
create table if not exists zero_notes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  country text not null,
  city text,
  year int,
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

create policy "anon full access to zero_notes" on zero_notes
  for all using (true) with check (true);

create policy "anon full access to currency_items" on currency_items
  for all using (true) with check (true);

create policy "anon read/write catalog-photos" on storage.objects
  for all using (bucket_id = 'catalog-photos') with check (bucket_id = 'catalog-photos');

-- Seed: standard Eurozone denominations (verified, current as of 2026).
-- Coins run 1c-2 euro, notes run 5-500 (note: the 500 was discontinued from
-- new issuance in 2019 but existing ones remain legal tender, so it's
-- included as a genuine rarity to chase).
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
