-- Balance calórico: perfil para calcular metabolismo y meta, kcal en comidas y entrenamientos.

create type sex as enum ('male', 'female');

create table profile (
  user_id          uuid primary key default auth.uid() references auth.users on delete cascade,
  sex              sex not null,
  birth_date       date not null,
  height_cm        numeric(4,1) not null check (height_cm between 100 and 250),
  goal_weight_kg   numeric(5,2) not null check (goal_weight_kg between 30 and 250),
  activity_level   text not null default 'sedentary' check (activity_level in ('sedentary', 'light', 'moderate')),
  weekly_loss_kg   numeric(3,2) not null default 0.5 check (weekly_loss_kg between 0 and 1),
  updated_at       timestamptz not null default now()
);
alter table profile enable row level security;
create policy own_row on profile for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- items: [{ "name": "Milanesa al horno", "kcal": 250, "qty": 1 }]; kcal es el total de la comida.
alter table meal_log add column kcal  integer check (kcal is null or kcal between 0 and 10000);
alter table meal_log add column items jsonb not null default '[]'::jsonb;

-- Kcal netas estimadas del entrenamiento (método MET) y tipo de actividad de cardio.
alter table workout add column kcal     integer check (kcal is null or kcal between 0 and 5000);
alter table workout add column activity text;
