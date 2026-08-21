-- Already applied directly to the live Supabase project (youpkgxpdsmgmkmsxpbh)
-- via the Supabase MCP tool. Included here for repo history / future
-- environments only — do not re-run against the live DB.

alter table souvenirs add column if not exists place text;
alter table souvenirs add column if not exists address text;
