-- La Edge Function importar-salud usa la service role. Con "Automatically expose new tables" desactivado
-- no tiene permisos por defecto; se le dan solo las tablas que toca.
grant select on health_token to service_role;
grant select, insert, update on workout, body_metric to service_role;
