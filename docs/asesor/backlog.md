# Backlog Trigli

Prioridad: impacto sobre TG y peso / esfuerzo / riesgo. Esfuerzo: S / M / L.

## Pendiente (requiere infraestructura o secretos)
| Idea | Problema que resuelve | Esfuerzo | Notas |
|---|---|---|---|
| Notificaciones push | Olvido de registrar comidas, cardio o pesarse | L | VAPID + Edge Function + cron |
| Foto + IA para clasificar comidas | Registrar una comida lleva muchos toques | L | Edge Function con API key de Anthropic |

## Ideas sin validar
- Escanear código de barras de productos envasados para cargar sus kcal (M)
- Plan de entrenamiento con mancuernas y banco: qué hacer cada día (M)
- Resumen semanal automático con una sugerencia concreta (M)
- Exportar datos (CSV/PDF) para llevar al médico, con TG junto a peso y comida (S)
- Funcionar sin conexión y sincronizar después (L)
- Agua y pasos diarios (S)
- Correlación TG vs. cardio / peso / score en el gráfico de Laboratorio (M)
- Seguimiento de omega-3 y fibra (hoy solo hay marcas de calidad) (M)
- Recordatorio semanal de medir cintura (S)
- Cambiar el mail de la cuenta y borrar la cuenta (necesita Edge Function) (M)

## Hecho
- Calorías por comida, catálogo de alimentos, gramos opcionales, cortes de carne
- Meta calórica y balance diario; kcal de ejercicio por MET
- Seguimiento: tendencia de peso, déficit semanal, proteína
- Favoritas y repetir comida anterior
- Gráfico de peso con meta y proyección
- Modo claro/oscuro, marca nueva, Mi cuenta con foto

## Criterio para v1 de cada feature
Definir: problema, métrica de éxito, qué se puede cortar.
