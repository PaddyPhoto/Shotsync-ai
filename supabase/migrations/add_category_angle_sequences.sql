alter table brands
  add column if not exists category_angle_sequences jsonb default '[]'::jsonb;
