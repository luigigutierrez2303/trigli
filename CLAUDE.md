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

Hecho (detalle en `docs/asesor/estado-actual.md`):
- Acceso con Google o email + contraseña (con recuperación). Schema con RLS, grants y bucket de avatares.
- Comidas: score derivado de los alimentos, calorías con catálogo `energy/foods.ts` (~265 alimentos, categorías, gramos opcionales), favoritas y repetir comida anterior.
- Balance calórico (`features/energy/`): meta en Mi cuenta (Mifflin-St Jeor + déficit, piso 1500/1200 kcal), kcal de ejercicio por MET ((MET−1)×kg×h), tendencia de peso con promedio móvil, déficit semanal, proteína 1,6 g/kg, gráfico de peso con meta (`weight-chart.component.ts`).
- Actividad (cardio con tipo y kcal, editable y con "Repetir" de los combos frecuentes; peso y cintura con gráfico; kcal de la semana contra la anterior), fuerza con doble progresión, laboratorio con gráfico de TG (`line-chart.component.ts`), Resumen semanal (tabla de escritorio y, en celular, una fila por día).
- Mi cuenta: foto, meta, apariencia (automático/claro/oscuro vía clase `ion-palette-dark`), contraseña.
- Importación desde Apple Salud (`importar-salud`, Atajo de iOS, guía en `docs/atajo-salud.md`): total diario de energía activa (lo estima el iPhone, no Fitbeing) y peso. Los entrenos de Fitbeing no se pueden leer con Atajos y Strava exige suscripción; los minutos se cargan a mano con el lápiz de la fila "Actividad de Salud". La función se despliega con `--no-verify-jwt` y usa la service role (grants en la migración `service_role_grants`).
- Análisis de comidas con IA (texto y foto): Edge Function `analizar-comida` con Gemini (secret `GEMINI_API_KEY`, límite diario `AI_DAILY_LIMIT`), cliente en `meal-ai.service.ts`.
- Hábitos que mueven los TG (`features/habits/`): tarjeta semanal en Resumen (pescado graso, fibra, días con alcohol y con azúcar, más una sugerencia) y, en Laboratorio, promedios semanales entre cada par de análisis (aeróbico, score, alcohol, pescado, peso). Las listas de marcas de cada factor están en `habits.ts`.
- Fuerza muestra el día del plan (empuje / tracción / piernas, rota según la última sesión; `strength/training-plan.ts`). Comidas tiene el contador de agua (`features/water/`, tabla `water_log`, migración `20261103000000_water.sql` a aplicar a mano).
- Primeros pasos (`features/onboarding/`): asistente `/bienvenida` de 5 pasos (datos, meta, TG opcional, cómo se usa) que `onboardingGuard` muestra a quien no tiene perfil (se saltea con la marca `trigli.onboarding.skipped` en localStorage; se repite desde Mi cuenta → Ayuda), y tarjeta "Primeros pasos" en Resumen (`first-steps.component.ts`).
- La PWA busca y aplica versiones nuevas al volver a la app (`core/app-update.ts`).
- Tabs: Resumen, Comidas, Actividad, Fuerza, Lab, Cuenta. Marca "Descenso" (verde bosque #0F3D3E + lima #C8F169).

Notas de UI:
- La app usa modo iOS de Ionic: `fill="outline"` no existe ahí, los campos se dibujan en `theme/components.scss`.
- Un servicio que cambia comidas, entrenos, peso o perfil debe llamar `ProfileService.notifyChange()` para que las tarjetas de balance se recarguen.

Reglas del score a recordar: las marcas que suman (omega-3, fibra, grasas buenas) piden al menos media porción (`MIN_BONUS_QTY` en `foods.ts`); las que restan cuentan con cualquier cantidad. Si el balance tiene el total de Salud del día, el cardio manual no suma kcal (`burnedKcal`).

Pendiente (requiere infraestructura/secretos del usuario):
1. Notificaciones push (VAPID + Edge Function + cron)
