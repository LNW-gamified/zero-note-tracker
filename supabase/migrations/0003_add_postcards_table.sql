-- Already applied directly to the live Supabase project (youpkgxpdsmgmkmsxpbh)
-- via the Supabase MCP tool. Included here for repo history / future
-- environments only — do not re-run against the live DB.

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

alter table postcards enable row level security;

create policy "anon full access to postcards" on postcards
  for all using (true) with check (true);
