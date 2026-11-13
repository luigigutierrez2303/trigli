-- Comida libre: una comida planificada por semana que no entra en el score del día.
-- Los flags de la comida se conservan para analizarlos después. La RLS de meal_log no cambia.
alter table meal_log add column is_free_meal boolean not null default false;

-- El score diario ignora las comidas libres; un día con solo libres no tiene score (sin penalización).
create or replace view meal_daily_score with (security_invoker = true) as
select user_id,
       date,
       round(avg(score) filter (where not is_free_meal) * 10)::int as score,
       count(*)                                                    as meals,
       bool_or(coalesce((flags->>'alcohol')::bool, false))         as had_alcohol
from meal_log
group by user_id, date
having count(*) filter (where not is_free_meal) > 0;
