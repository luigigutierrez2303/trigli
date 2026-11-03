# Backlog Trigli

Prioridad: impacto sobre TG y peso / esfuerzo / riesgo. Esfuerzo: S / M / L.

## Pendiente (requiere infraestructura o secretos)
| Idea | Problema que resuelve | Esfuerzo | Notas |
|---|---|---|---|
| Notificaciones push | Olvido de registrar comidas, cardio o pesarse | L | VAPID + Edge Function + cron |

## Ideas sin validar
- Escanear código de barras de productos envasados para cargar sus kcal (M)
- Funcionar sin conexión y sincronizar después (L)
- Pasos diarios (el agua ya está; los pasos saldrían del Atajo de Salud) (S)
- Cambiar el mail de la cuenta y borrar la cuenta (necesita Edge Function) (M)

## Hecho
- Informe para el médico, hábitos semanales, promedios entre análisis, avisos en la app, repetir lo de ayer, pull-to-refresh
- Calorías por comida, catálogo de alimentos, gramos opcionales, cortes de carne
- Meta calórica y balance diario; kcal de ejercicio por MET
- Seguimiento: tendencia de peso, déficit semanal, proteína
- Favoritas y repetir comida anterior
- Gráfico de peso con meta y proyección
- Modo claro/oscuro, marca nueva, Mi cuenta con foto

## Criterio para v1 de cada feature
Definir: problema, métrica de éxito, qué se puede cortar.
