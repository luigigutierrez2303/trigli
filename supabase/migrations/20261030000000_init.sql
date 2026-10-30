-- Trigli: schema inicial
-- Todas las tablas con RLS: cada usuario solo ve/modifica lo suyo.

-- ============ Comidas ============
create type meal_type as enum ('breakfast', 'lunch', 'snack', 'dinner');

create table meal_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  date        date not null default current_date,
  meal_type   meal_type not null,
  flags       jsonb not null default '{}'::jsonb,   -- { alcohol: true, veggies: true, ... }
  score       smallint not null check (score between 0 and 10),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (user_id, date, meal_type)
);
create index meal_log_user_date on meal_log (user_id, date desc);

-- Score diario 0-100 (promedio de comidas * 10)
create view meal_daily_score with (security_invoker = true) as
select user_id,
       date,
       round(avg(score) * 10)::int                       as score,
       count(*)                                          as meals,
       bool_or(coalesce((flags->>'alcohol')::bool, false)) as had_alcohol
from meal_log
group by user_id, date;

-- ============ Ejercicio ============
create type workout_type as enum ('strength', 'cardio');

create table exercise (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade,  -- null = catálogo global
  name       text not null,
  equipment  text not null default 'dumbbell',
  muscle     text
);

create table workout (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  date          date not null default current_date,
  type          workout_type not null,
  duration_min  smallint not null check (duration_min > 0),
  notes         text,
  created_at    timestamptz not null default now()
);
create index workout_user_date on workout (user_id, date desc);

create table workout_set (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references workout on delete cascade,
  exercise_id  uuid not null references exercise,
  set_number   smallint not null,
  reps         smallint not null check (reps > 0),
  weight_kg    numeric(5,2)
);

-- ============ Métricas ============
create table body_metric (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  date       date not null default current_date,
  weight_kg  numeric(5,2),
  waist_cm   numeric(5,1),
  unique (user_id, date)
);

create table lab_result (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  date        date not null,
  tg          smallint,   -- triglicéridos mg/dL
  hdl         smallint,
  ldl         smallint,
  total_chol  smallint,
  glucose     smallint,
  notes       text
);
create index lab_result_user_date on lab_result (user_id, date desc);

-- ============ RLS ============
alter table meal_log    enable row level security;
alter table exercise    enable row level security;
alter table workout     enable row level security;
alter table workout_set enable row level security;
alter table body_metric enable row level security;
alter table lab_result  enable row level security;

create policy own_rows on meal_log    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on workout     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on body_metric for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on lab_result  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy read_global_or_own on exercise for select using (user_id is null or user_id = auth.uid());
create policy write_own on exercise for insert with check (user_id = auth.uid());
create policy update_own on exercise for update using (user_id = auth.uid());
create policy delete_own on exercise for delete using (user_id = auth.uid());

create policy via_workout on workout_set for all
  using (exists (select 1 from workout w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workout w where w.id = workout_id and w.user_id = auth.uid()));

-- ============ Seed: mancuernas + banco ============
insert into exercise (name, equipment, muscle) values
  ('Press banca con mancuernas', 'dumbbell+bench', 'pecho'),
  ('Press inclinado con mancuernas', 'dumbbell+bench', 'pecho'),
  ('Remo a una mano', 'dumbbell+bench', 'espalda'),
  ('Pullover', 'dumbbell+bench', 'espalda'),
  ('Press militar sentado', 'dumbbell+bench', 'hombros'),
  ('Elevaciones laterales', 'dumbbell', 'hombros'),
  ('Curl de bíceps', 'dumbbell', 'bíceps'),
  ('Extensión de tríceps acostado', 'dumbbell+bench', 'tríceps'),
  ('Sentadilla goblet', 'dumbbell', 'piernas'),
  ('Peso muerto rumano', 'dumbbell', 'piernas'),
  ('Estocadas', 'dumbbell', 'piernas'),
  ('Sentadilla búlgara', 'dumbbell+bench', 'piernas'),
  ('Hip thrust', 'dumbbell+bench', 'glúteos');
