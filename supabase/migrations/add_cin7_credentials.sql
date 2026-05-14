-- Cin7 Core API credentials per brand
alter table public.brands
  add column if not exists cin7_account_id text,
  add column if not exists cin7_application_key text;
