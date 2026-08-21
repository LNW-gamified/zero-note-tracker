-- Already applied directly to the live Supabase project (youpkgxpdsmgmkmsxpbh)
-- via the Supabase MCP tool. Included here for repo history / future
-- environments only — do not re-run against the live DB.

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

alter table souvenirs enable row level security;
alter table food_items enable row level security;

create policy "anon full access to souvenirs" on souvenirs
  for all using (true) with check (true);

create policy "anon full access to food_items" on food_items
  for all using (true) with check (true);
