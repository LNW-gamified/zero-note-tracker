-- Already applied directly to the live Supabase project (youpkgxpdsmgmkmsxpbh)
-- via the Supabase MCP tool. Included here for repo history / future
-- environments only — do not re-run against the live DB.

-- Postcards move from a single collected/collected_date pair to a
-- three-stage status: not_sent -> sent -> received, each with its own date.
alter table postcards add column if not exists status text not null default 'not_sent'
  check (status in ('not_sent', 'sent', 'received'));
alter table postcards add column if not exists sent_date date;
alter table postcards add column if not exists received_date date;
alter table postcards add column if not exists sent_from text;
alter table postcards add column if not exists address text;

update postcards
set status = case when collected then 'sent' else 'not_sent' end,
    sent_date = collected_date;

alter table postcards drop column collected;
alter table postcards drop column collected_date;

-- Restaurant address, so food entries can show a map.
alter table food_items add column if not exists address text;
