-- Already applied directly to the live Supabase project (youpkgxpdsmgmkmsxpbh)
-- via the Supabase MCP tool. Included here for repo history / future
-- environments only — do not re-run against the live DB.

alter table zero_notes rename column title to name;
alter table zero_notes add column if not exists identification text;

alter table currency_items add column if not exists year int;
