import { inject, Injectable } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { DailyScore, DatedWorkout, WeekMeal, WeekMetric } from './dashboard';

export interface WeekData {
  scores: DailyScore[];
  workouts: DatedWorkout[];
  weights: number[];
  meals: WeekMeal[];
  metrics: WeekMetric[];
  /** Todas las mediciones de TG, de la más antigua a la más reciente. */
  tgSeries: { date: string; tg: number }[];
  latestTg: { date: string; tg: number } | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly db = inject(Supabase).client;

  async week(from: string, to: string): Promise<WeekData> {
    const [scores, meals, workouts, metrics, lab] = await Promise.all([
      this.db.from('meal_daily_score').select('date, score').gte('date', from).lte('date', to).order('date'),
      this.db.from('meal_log').select('date, meal_type, score, flags').gte('date', from).lte('date', to),
      this.db.from('workout').select('date, type, duration_min').gte('date', from).lte('date', to),
      this.db.from('body_metric').select('date, weight_kg').not('weight_kg', 'is', null).gte('date', from).lte('date', to).order('date'),
      this.db.from('lab_result').select('date, tg').not('tg', 'is', null).order('date'),
    ]);
    for (const r of [scores, meals, workouts, metrics, lab]) if (r.error) throw r.error;

    const tgSeries = lab.data!.map((r) => ({ date: r.date as string, tg: r.tg as number }));
    return {
      scores: scores.data as DailyScore[],
      workouts: workouts.data as DatedWorkout[],
      weights: metrics.data!.map((m) => Number(m.weight_kg)),
      meals: meals.data as WeekMeal[],
      metrics: metrics.data!.map((m) => ({ date: m.date as string, weight_kg: Number(m.weight_kg) })),
      tgSeries,
      latestTg: tgSeries.at(-1) ?? null,
    };
  }
}
