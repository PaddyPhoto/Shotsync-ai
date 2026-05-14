-- Brand voice fields for AI copy personalisation
alter table public.brands
  add column if not exists voice_brief text,
  add column if not exists copy_examples text[];
