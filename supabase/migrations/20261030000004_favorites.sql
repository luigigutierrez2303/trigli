-- Comidas favoritas: armás una vez (alimentos + marcas de calidad) y las agregás con un toque.
create table favorite_meal (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  -- items: [{ "name": "Huevo", "kcal": 75, "protein": 6, "qty": 2 }]; flags: marcas manuales de calidad
  items       jsonb not null default '[]'::jsonb,
  flags       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index favorite_meal_user on favorite_meal (user_id, created_at desc);

alter table favorite_meal enable row level security;
create policy own_rows on favorite_meal for all using (user_id = auth.uid()) with check (user_id = auth.uid());
