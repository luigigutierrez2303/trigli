-- El proyecto se creó con "Automatically expose new tables" desactivado,
-- así que los permisos al rol authenticated son explícitos. La seguridad
-- por fila la sigue dando RLS (auth.uid()).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Tablas futuras creadas por la migración (rol postgres) heredan los mismos permisos.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
