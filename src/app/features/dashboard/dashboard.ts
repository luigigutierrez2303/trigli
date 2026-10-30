import { toIsoDate } from '../../core/date';
import { levelForDay } from '../meals/meal-scoring';

export interface DailyScore {
  date: string;
  score: number;
}

export interface WeekWorkout {
  type: 'cardio' | 'strength';
  duration_min: number;
}

export interface WeekSummary {
  avgScore: number | null;
  daysLogged: number;
  cardioMin: number;
  strengthSessions: number;
}

/** Los 7 días (lunes a domingo) de la semana que empieza en `monday`. */
export function weekDays(monday: string): string[] {
  const d = new Date(monday + 'T12:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return toIsoDate(day);
  });
}

export function summarizeWeek(scores: DailyScore[], workouts: WeekWorkout[]): WeekSummary {
  const avg = scores.length ? Math.round(scores.reduce((s, d) => s + d.score, 0) / scores.length) : null;
  return {
    avgScore: avg,
    daysLogged: scores.length,
    cardioMin: workouts.filter((w) => w.type === 'cardio').reduce((s, w) => s + w.duration_min, 0),
    strengthSessions: workouts.filter((w) => w.type === 'strength').length,
  };
}

/** Cambio de peso entre la primera y la última medición de la semana (null si hay menos de dos). */
export function weekWeightChange(weights: number[]): number | null {
  if (weights.length < 2) return null;
  return Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10;
}

/** Un score por cada día de la semana (null = sin registro), para el gráfico de barras. */
export function dailyBars(monday: string, scores: DailyScore[]) {
  const byDate = new Map(scores.map((s) => [s.date, s.score]));
  return weekDays(monday).map((date) => {
    const score = byDate.get(date) ?? null;
    return { date, score, level: score === null ? null : levelForDay(score) };
  });
}
