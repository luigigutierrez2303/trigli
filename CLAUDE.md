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
- Actividad (cardio con tipo y kcal, peso, cintura), fuerza con doble progresión, laboratorio con gráfico de TG (`line-chart.component.ts`), Resumen semanal.
- Mi cuenta: foto, meta, apariencia (automático/claro/oscuro vía clase `ion-palette-dark`), contraseña.
- Tabs: Resumen, Comidas, Actividad, Fuerza, Lab, Cuenta. Marca "Descenso" (verde bosque #0F3D3E + lima #C8F169).

Notas de UI:
- La app usa modo iOS de Ionic: `fill="outline"` no existe ahí, los campos se dibujan en `theme/components.scss`.
- Un servicio que cambia comidas, entrenos, peso o perfil debe llamar `ProfileService.notifyChange()` para que las tarjetas de balance se recarguen.

Pendiente (requieren infraestructura/secretos del usuario):
1. Notificaciones push (VAPID + Edge Function + cron)
2. Foto + IA para clasificar comidas (Edge Function con API key de Anthropic)
