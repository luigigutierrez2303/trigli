-- Total diario de energía activa importado de Salud: una fila de cardio por día, sin duración
-- (Salud no expone los entrenos a los Atajos), por eso no suma minutos de aeróbico.
alter table workout drop constraint if exists workout_duration_min_check;
alter table workout add constraint workout_duration_min_check check (duration_min > 0 or source = 'health');
