-- Importación desde Apple Salud (vía Atajo de iOS): token personal y dedupe de entrenos importados.

-- Solo se guarda el hash SHA-256 del token; el valor en claro se muestra una vez en Mi cuenta.
create table health_token (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  token_hash  text not null,
  created_at  timestamptz not null default now()
);
alter table health_token enable row level security;
create policy own_row on health_token for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- external_id: id del entreno en Salud (o fecha+inicio), para no duplicar al reenviar.
alter table workout add column source text not null default 'manual' check (source in ('manual', 'health'));
alter table workout add column external_id text;
-- Los null son distintos entre sí, así que los entrenos manuales no chocan.
create unique index workout_external on workout (user_id, external_id);
