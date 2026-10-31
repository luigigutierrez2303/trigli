# Estado actual de Trigli (2026-10-30)

PWA para registrar alimentación y ejercicio con el objetivo de bajar triglicéridos y peso.
Angular 22 + Ionic 9 + Supabase, deploy en Vercel. Marca "Descenso" (verde bosque + lima).

## Pestañas
Resumen, Comidas, Actividad, Fuerza, Lab, Cuenta.

## Funcionalidad
- **Acceso:** Google o email + contraseña, con recuperación de contraseña.
- **Comidas:**
  - Score 0-10 por comida y diario, derivado de los alimentos cargados (la pestaña Calidad permite sumar marcas a mano).
  - Calorías: catálogo de ~265 alimentos en 14 categorías, con kcal y proteína por porción, cortes de carne por 100 g y cantidad en gramos opcional.
  - Favoritas y "repetir la comida anterior".
- **Actividad:** cardio con tipo de actividad y kcal estimadas por MET (meta 150 min/sem, barras por día), peso y cintura.
- **Fuerza:** doble progresión (8-12 reps, +2 kg), kcal estimadas.
- **Laboratorio:** gráfico de TG con zonas (normal / límite / alto), historial.
- **Resumen:** balance de hoy (anillo de kcal), tendencia de peso, déficit semanal, proteína, gráfico de peso con meta y fecha estimada de llegada, y la semana (tabla en desktop).
- **Mi cuenta:** foto de perfil (Google o subida), meta calórica (Mifflin-St Jeor + ritmo de pérdida, piso 1500/1200 kcal), apariencia (automático / claro / oscuro), contraseña, cerrar sesión.
- **Mobile:** barra superior con marca y botón de tema; el desktop usa rail lateral.

## Migraciones de Supabase (hay que aplicarlas a mano)
`init`, `grants`, `avatars`, `energy`, `favorites`. Sin `energy` no funciona la meta ni las kcal; sin `favorites`, las favoritas; sin `avatars`, la foto subida.

## Calidad
62 tests (lógica pura: score, energía, alimentos, dashboard, laboratorio, actividad, fuerza). La interfaz se revisó en celular y desktop, claro y oscuro, con datos simulados; falta una revisión con datos reales.

## Pendiente
- Notificaciones push (VAPID + Edge Function + cron).
- Foto + IA para clasificar comidas (Edge Function con API key de Anthropic).
- Ver `backlog.md`.
