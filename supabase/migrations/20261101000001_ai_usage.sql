-- Cupo diario de análisis de comidas con IA, por usuario. Lo consume solo la Edge Function (service_role).
create table ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);

alter table ai_usage enable row level security;
create policy own_rows on ai_usage for select using (user_id = auth.uid());
revoke insert, update, delete on ai_usage from authenticated;

-- Suma un uso del día si queda cupo. Devuelve false cuando ya se llegó al límite.
create function take_ai_quota(p_user uuid, p_limit integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  used integer;
begin
  insert into ai_usage as u (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = u.count + 1 where u.count < p_limit
  returning u.count into used;
  return used is not null;
end;
$$;

revoke execute on function take_ai_quota(uuid, integer) from public, anon, authenticated;
grant execute on function take_ai_quota(uuid, integer) to service_role;
