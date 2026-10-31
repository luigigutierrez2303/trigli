# Backlog Trigli

Prioridad: impacto sobre TG / esfuerzo / riesgo. Esfuerzo: S / M / L.

## Pendiente (requiere infraestructura o secretos)
| Idea | Problema que resuelve | Esfuerzo | Notas |
|---|---|---|---|
| Notificaciones push | Olvido de registrar comidas/cardio | L | VAPID + Edge Function + cron |
| Foto + IA para clasificar comidas | Registrar una comida lleva muchos toques | L | Edge Function con API key de Anthropic |

## Ideas sueltas (sin validar)
- Favoritos de comidas (en curso: `favorite.service.ts`, migración `20261030000004_favorites.sql`)
- Gráfico de tendencia de peso (en curso: `weight-chart.component.ts`)
- Recordatorio semanal de pesarse / medir cintura
- Correlación TG vs. cardio/peso/score en el gráfico de Laboratorio
- Seguimiento de omega-3 y fibra (hoy solo hay flags de comida)
- Exportar datos para llevar al médico

## Criterio para v1 de cada feature
Definir: problema, métrica de éxito, qué se puede cortar.
