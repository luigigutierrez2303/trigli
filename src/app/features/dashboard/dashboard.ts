import { toIsoDate } from '../../core/date';
import { hasAlcohol, levelForDay, levelForMeal, MEAL_ORDER, MealFlags, MealType, ScoreLevel, scoreDay } from '../meals/meal-scoring';

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

export interface WeekMeal {
  date: string;
  meal_type: MealType;
  score: number;
  flags: MealFlags;
}

export interface DatedWorkout extends WeekWorkout {
  date: string;
}

export interface WeekMetric {
  date: string;
  weight_kg: number;
}

export interface GridMeal {
  score: number;
  level: ScoreLevel;
  alcohol: boolean;
}

export interface GridDay {
  date: string;
  isToday: boolean;
  isFuture: boolean;
  dayScore: number | null;
  dayLevel: ScoreLevel | null;
  meals: Record<MealType, GridMeal | null>;
  cardioMin: number | null;
  strengthMin: number | null;
  weightKg: number | null;
}

/** Una columna por día de la semana (lunes a domingo) con todo lo que muestra la tabla de escritorio. */
export function weekGrid(
  monday: string,
  today: string,
  data: { meals: WeekMeal[]; workouts: DatedWorkout[]; metrics: WeekMetric[] },
): GridDay[] {
  const minutes = (date: string, type: WeekWorkout['type']) => {
    const found = data.workouts.filter((w) => w.date === date && w.type === type);
    return found.length ? found.reduce((s, w) => s + w.duration_min, 0) : null;
  };

  return weekDays(monday).map((date) => {
    const dayMeals = data.meals.filter((m) => m.date === date);
    const dayScore = scoreDay(dayMeals.map((m) => m.score));
    const meals = Object.fromEntries(
      MEAL_ORDER.map((type) => {
        const m = dayMeals.find((x) => x.meal_type === type);
        return [type, m ? { score: m.score, level: levelForMeal(m.score), alcohol: hasAlcohol(m.flags) } : null];
      }),
    ) as Record<MealType, GridMeal | null>;

    return {
      date,
      isToday: date === today,
      isFuture: date > today,
      dayScore,
      dayLevel: dayScore === null ? null : levelForDay(dayScore),
      meals,
      cardioMin: minutes(date, 'cardio'),
      strengthMin: minutes(date, 'strength'),
      weightKg: data.metrics.find((m) => m.date === date)?.weight_kg ?? null,
    };
  });
}
