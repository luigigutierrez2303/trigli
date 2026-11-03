-- Agua del día: un renglón por usuario y fecha, en vasos de 250 ml.
create table water_log (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date    date not null,
  glasses smallint not null check (glasses between 0 and 30),
  primary key (user_id, date)
);

alter table water_log enable row level security;
create policy own_rows on water_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());
