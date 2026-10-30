# Trigli

PWA para controlar alimentación y ejercicio con foco en bajar triglicéridos.
Angular 22 (standalone, zoneless) + Ionic 9 + Supabase.

## Setup

1. Crear un proyecto en Supabase.
2. Correr la migración:
   - CLI: `supabase link --project-ref <ref> && supabase db push`
   - o pegar `supabase/migrations/20261030000000_init.sql` en el SQL Editor.
3. Auth → Providers → Email: habilitado (magic link).
   Auth → URL Configuration: agregar `http://localhost:4200` y la URL de Vercel en *Redirect URLs*.
4. Completar `src/environments/environment.ts` con URL y anon key.
5. `npm i && npm start`

## Deploy (Vercel)

- Framework: Angular · Build: `npm run build` · Output: `dist/trigli/browser`
- Agregar rewrite SPA (`vercel.json` incluido).

## Estructura

```
src/app/
  core/            supabase client, auth guard
  features/auth/   login con magic link
  features/meals/  registro de comidas
    meal-scoring.ts   lógica pura de score (testeada)
    meal.service.ts   CRUD meal_log
    meal-log.page.*   pantalla del día + editor
supabase/migrations/  schema completo + RLS + seed de ejercicios
```

## Score

- Cada comida arranca en 6 y suma/resta según flags (pesos en `FLAG_DEFS`), clamp 0-10.
- Día = promedio de comidas × 10 (0-100). Verde ≥70, amarillo ≥40, rojo <40.
- Se guarda `score` en DB para poder consultarlo desde la vista `meal_daily_score`.

## Schema

| Tabla | Uso |
|---|---|
| `meal_log` | una fila por (día, comida), flags jsonb + score |
| `meal_daily_score` | vista: score diario, cantidad de comidas, si hubo alcohol |
| `workout` / `workout_set` | fuerza y cardio, sets con peso |
| `exercise` | catálogo global (seed mancuernas + banco) + propios |
| `body_metric` | peso y cintura |
| `lab_result` | TG, HDL, LDL, colesterol total, glucosa |

Todo con RLS por `auth.uid()`.

## Próximos pasos

1. Cardio y peso (`workout` type cardio, `body_metric`)
2. Rutinas de fuerza con progresión
3. Laboratorio + gráficos
4. Dashboard semanal, push, foto + IA
