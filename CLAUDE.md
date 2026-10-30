# Trigli

PWA para registrar alimentación y ejercicio con el objetivo de bajar triglicéridos.
Angular 22 (standalone, zoneless, signals) + Ionic 9 + Supabase. Deploy en Vercel.

## Comandos

- `npm start`: dev server en http://localhost:4200
- `npm run build`: build de producción (`dist/trigli/browser`)
- `npm test -- --watch=false`: tests (Vitest)

## Convenciones

- Componentes standalone. Los imports de Ionic van desde `@ionic/angular` (en Ionic 9 ya no existe `@ionic/angular/standalone`).
- Zoneless: el estado de UI va en `signal`/`computed`, no en propiedades mutables.
- Una carpeta por feature en `src/app/features/<feature>/`, con `*.page.ts`, `*.service.ts` y la lógica pura separada y testeada (ver `meal-scoring.ts`).
- Textos de UI en español rioplatense.
- Cambios de DB: nueva migración en `supabase/migrations/` con timestamp. Nunca editar una migración ya aplicada. Toda tabla nueva lleva RLS por `auth.uid()`.

## Dominio

- Score de comida 0-10: base 6 + pesos de `FLAG_DEFS`. Score del día = promedio × 10.
- Factores que más suben TG: alcohol, azúcar, harinas refinadas, exceso calórico. Bajan: aeróbico, pérdida de peso, omega-3, fibra.
- Equipo de entrenamiento: mancuernas + banco en casa.

## Estado

Hecho: login con magic link, registro de comidas con score diario, schema completo con RLS.

Pendiente (en orden):
1. Cardio (`workout` type `cardio`) y peso (`body_metric`)
2. Rutinas de fuerza con `workout_set` y progresión de cargas
3. Carga de laboratorio (`lab_result`) y gráficos de tendencia
4. Dashboard semanal, notificaciones push, foto + IA para clasificar comidas
