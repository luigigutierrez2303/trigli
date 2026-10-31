# Trigli

PWA para controlar alimentación y ejercicio con foco en bajar triglicéridos y peso.
Angular 22 (standalone, zoneless) + Ionic 9 + Supabase.

## Setup

1. Crear un proyecto en Supabase.
2. Correr las migraciones de `supabase/migrations/` en orden:
   - CLI: `supabase link --project-ref <ref> && supabase db push`
   - o pegar cada archivo en el SQL Editor, en orden de timestamp.
3. Auth → Providers: habilitar Email (con contraseña) y Google.
   Auth → URL Configuration: agregar `http://localhost:4200` y la URL de Vercel en *Redirect URLs*.
4. Completar `src/environments/environment.ts` con URL y anon key.
5. `npm i && npm start`

## Deploy (Vercel)

- Framework: Angular · Build: `npm run build` · Output: `dist/trigli/browser`
- Agregar rewrite SPA (`vercel.json` incluido).

## Estructura

```
src/app/
  core/             supabase client, auth guard, tema claro/oscuro
  features/auth/        login (Google o email + contraseña) y recuperación
  features/meals/       comidas: score, editor con calorías, favoritas
  features/energy/      balance calórico: meta, alimentos, kcal por MET, tendencia de peso
  features/activity/    cardio, peso y cintura
  features/strength/    fuerza con doble progresión
  features/labs/        laboratorio y gráfico de TG
  features/dashboard/   Resumen semanal
  features/account/     Mi cuenta: foto, meta, apariencia
  features/tabs/        navegación (barra inferior en celular, rail en desktop)
supabase/migrations/  schema, RLS, grants, avatars, energy, favorites
docs/asesor/          estado actual, backlog y decisiones de producto
```

La lógica pura vive en archivos testeados aparte de las páginas (`meal-scoring.ts`, `energy/energy.ts`, `dashboard.ts`, `labs.ts`).

## Score

- Cada comida arranca en 6 y suma/resta según marcas (pesos en `FLAG_DEFS`), clamp 0-10.
- Los alimentos cargados por calorías activan sus marcas solos (`foods.ts`); se pueden sumar otras a mano.
- Día = promedio de comidas × 10 (0-100). Verde ≥70, amarillo ≥40, rojo <40.

## Calorías

- Meta: Mifflin-St Jeor + factor de actividad diaria (sin contar entrenamientos) − déficit semanal (0,25 / 0,5 / 0,75 kg), con piso de 1500 kcal (hombres) / 1200 (mujeres).
- Ejercicio: kcal netas = (MET − 1) × kg × horas, se suman al presupuesto del día.
- Proteína: 1,6 g por kg de peso.

## Schema

| Tabla | Uso |
|---|---|
| `meal_log` | una fila por (día, comida): marcas, score, kcal e ítems cargados |
| `meal_daily_score` | vista: score diario, cantidad de comidas, si hubo alcohol |
| `favorite_meal` | comidas favoritas (ítems y marcas) |
| `workout` / `workout_set` | fuerza y cardio, con tipo de actividad y kcal; sets con peso |
| `exercise` | catálogo global (seed mancuernas + banco) + propios |
| `body_metric` | peso y cintura |
| `lab_result` | TG, HDL, LDL, colesterol total, glucosa |
| `profile` | datos para la meta: sexo, nacimiento, altura, peso objetivo, actividad, ritmo |
| bucket `avatars` | foto de perfil, privada, una por usuario |

Todo con RLS por `auth.uid()`.

## Tests

`npm test -- --watch=false` (Vitest).

## Próximos pasos

Notificaciones push y foto + IA para clasificar comidas (necesitan infraestructura y secretos). Más ideas en `docs/asesor/backlog.md`.
